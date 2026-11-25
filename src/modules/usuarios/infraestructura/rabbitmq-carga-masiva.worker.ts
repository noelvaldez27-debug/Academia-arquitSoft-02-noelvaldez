import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { Pool } from 'pg';
import { setTimeout as esperar } from 'node:timers/promises';
import { crearConexionRabbitMQ } from '../../../compartido/infraestructura';
import { LoteCargaMasiva } from '../aplicacion/carga-masiva.port';
import { ProcesarCargaMasivaUseCase } from '../aplicacion/procesar-carga-masiva.use-case';

const COLA = 'usuarios.carga-masiva';
const REINTENTOS = COLA + '.reintentos';
const FALLIDOS = COLA + '.fallidos';
const MAX_REINTENTOS = 3;

export class RabbitmqCargaMasivaWorker {
  constructor(private readonly pool: Pool, private readonly procesar: ProcesarCargaMasivaUseCase) {}

  async ejecutar(): Promise<never> {
    for (;;) {
      try {
        await this.conectar();
      } catch {
        console.error('Conexión del consumidor de cargas masivas interrumpida.');
      }
      await esperar(2000, undefined, { ref: false });
    }
  }

  private async conectar(): Promise<void> {
    const conexion = await crearConexionRabbitMQ();
    let abierta = true;
    conexion.on('error', () => {});
    conexion.once('close', () => { abierta = false; });
    try {
      const canal = await conexion.createConfirmChannel();
      canal.on('error', () => { abierta = false; });
      canal.once('close', () => { abierta = false; });
      await canal.assertQueue(FALLIDOS, { durable: true });
      await canal.assertQueue(COLA, { durable: true, deadLetterExchange: '', deadLetterRoutingKey: FALLIDOS });
      await canal.assertQueue(REINTENTOS, {
        durable: true, messageTtl: 5000, deadLetterExchange: '', deadLetterRoutingKey: COLA,
      });
      await canal.prefetch(1);
      await canal.consume(COLA, mensaje => {
        if (!mensaje) {
          abierta = false;
          return;
        }
        void this.consumir(canal, mensaje).catch(() => { abierta = false; });
      });
      while (abierta) {
        try {
          await this.publicarPendientes(canal);
        } catch {
          console.error('No se pudieron publicar los lotes pendientes.');
        }
        await esperar(1000);
      }
    } finally {
      await conexion.close().catch(() => {});
    }
  }

  private async publicarPendientes(canal: ConfirmChannel): Promise<void> {
    const { rows } = await this.pool.query<{ carga_id: string; numero_lote: number }>(
      'SELECT carga_id, numero_lote FROM envios_carga_masiva WHERE NOT publicado ORDER BY carga_id, numero_lote LIMIT 50',
    );
    for (const fila of rows) {
      const lote = { cargaId: fila.carga_id, numeroLote: fila.numero_lote };
      await this.enviar(canal, COLA, Buffer.from(JSON.stringify(lote)));
      await this.pool.query(
        'UPDATE envios_carga_masiva SET publicado = TRUE WHERE carga_id = $1 AND numero_lote = $2',
        [lote.cargaId, lote.numeroLote],
      );
    }
  }

  private enviar(canal: ConfirmChannel, cola: string, contenido: Buffer, intento = 0): Promise<void> {
    return new Promise((resolver, rechazar) => {
      canal.sendToQueue(cola, contenido, { persistent: true, headers: { intento } },
        error => error ? rechazar(error) : resolver());
    });
  }

  private async consumir(canal: ConfirmChannel, mensaje: ConsumeMessage): Promise<void> {
    let lote: LoteCargaMasiva;
    try {
      const datos = JSON.parse(mensaje.content.toString()) as Partial<LoteCargaMasiva> | null;
      if (!datos || typeof datos.cargaId !== 'string' || !/^[a-f0-9-]{36}$/i.test(datos.cargaId) ||
          typeof datos.numeroLote !== 'number' || !Number.isSafeInteger(datos.numeroLote) || datos.numeroLote < 1) {
        canal.nack(mensaje, false, false);
        return;
      }
      lote = { cargaId: datos.cargaId, numeroLote: datos.numeroLote };
    } catch {
      canal.nack(mensaje, false, false);
      return;
    }
    const intento = Number(mensaje.properties.headers?.intento ?? 0);
    try {
      if (intento > MAX_REINTENTOS) throw new Error();
      await this.procesar.ejecutar(lote);
    } catch {
      if (intento < MAX_REINTENTOS) {
        await this.enviar(canal, REINTENTOS, mensaje.content, intento + 1);
      } else {
        try {
          await this.procesar.marcarFallida(lote);
        } catch {
          // Si PostgreSQL sigue inaccesible, diferir únicamente el registro del fallo.
          await this.enviar(canal, REINTENTOS, mensaje.content, MAX_REINTENTOS + 1);
          canal.ack(mensaje);
          return;
        }
        canal.nack(mensaje, false, false);
        return;
      }
    }
    canal.ack(mensaje);
  }
}
