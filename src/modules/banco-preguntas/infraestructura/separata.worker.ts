import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { Pool } from 'pg';
import { setTimeout as esperar } from 'node:timers/promises';
import { crearConexionRabbitMQ } from '../../../compartido/infraestructura/conexion-rabbitmq';
import { ProcesarSeparataUseCase } from '../aplicacion/procesar-separata.use-case';
import { COLA_SEPARATAS, RabbitmqSeparataAdapter } from './rabbitmq-separata.adapter';

const COLA_REINTENTOS = COLA_SEPARATAS + '.reintentos';
const COLA_FALLOS = COLA_SEPARATAS + '.fallos';
const MAX_REINTENTOS = 3;

export class SeparataWorker {
  constructor(
    private readonly pool: Pool,
    private readonly publicador: RabbitmqSeparataAdapter,
    private readonly procesar: ProcesarSeparataUseCase,
  ) {}

  async ejecutar(): Promise<never> {
    for (;;) {
      try {
        await this.conectar();
      } catch {
        console.error('Conexión del worker de separatas interrumpida.');
      }
      await esperar(2000);
    }
  }

  private async conectar(): Promise<void> {
    const conexion = await crearConexionRabbitMQ();
    let activa = true;
    const cerrar = () => { activa = false; };
    conexion.on('error', cerrar);
    conexion.once('close', cerrar);
    try {
      const canal = await conexion.createConfirmChannel();
      canal.on('error', cerrar);
      canal.once('close', cerrar);
      await canal.assertQueue(COLA_FALLOS, { durable: true });
      await canal.assertQueue(COLA_SEPARATAS, {
        durable: true, deadLetterExchange: '', deadLetterRoutingKey: COLA_FALLOS,
      });
      await canal.assertQueue(COLA_REINTENTOS, {
        durable: true, messageTtl: 5000, deadLetterExchange: '', deadLetterRoutingKey: COLA_SEPARATAS,
      });
      await canal.prefetch(1);
      await canal.consume(COLA_SEPARATAS, mensaje => {
        if (!mensaje) cerrar();
        else void this.consumir(canal, mensaje).catch(cerrar);
      });
      while (activa) {
        try {
          await this.publicador.publicarPendiente(canal);
        } catch {
          console.error('No se pudo publicar una separata pendiente.');
        }
        await esperar(750);
      }
    } finally {
      await conexion.close().catch(() => {});
    }
  }

  private async consumir(canal: ConfirmChannel, mensaje: ConsumeMessage): Promise<void> {
    let id: unknown;
    try {
      id = JSON.parse(mensaje.content.toString())?.separataId;
    } catch {
      canal.nack(mensaje, false, false);
      return;
    }
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) {
      canal.nack(mensaje, false, false);
      return;
    }

    const cliente = await this.pool.connect();
    const clave = "hashtextextended('separata:' || $1, 0)";
    let tomado = false;
    let liberarConError = false;
    try {
      // Espera al procesamiento concurrente en vez de descartar una nueva autorización.
      await cliente.query('SELECT pg_advisory_lock(' + clave + ')', [id]);
      tomado = true;
      const intento = Number(mensaje.properties.headers?.intento ?? 0);
      try {
        if (intento > MAX_REINTENTOS) throw new Error('Reintentos agotados.');
        await this.procesar.ejecutar(id);
      } catch {
        if (intento < MAX_REINTENTOS) {
          await this.reintentar(canal, mensaje, intento + 1);
        } else {
          try {
            await this.procesar.registrarFallo(id);
          } catch {
            await this.reintentar(canal, mensaje, MAX_REINTENTOS + 1);
            canal.ack(mensaje);
            return;
          }
          canal.nack(mensaje, false, false);
          return;
        }
      }
      canal.ack(mensaje);
    } finally {
      if (tomado) {
        try {
          await cliente.query('SELECT pg_advisory_unlock(' + clave + ')', [id]);
        } catch {
          liberarConError = true;
        }
      }
      cliente.release(liberarConError);
    }
  }

  private reintentar(canal: ConfirmChannel, mensaje: ConsumeMessage, intento: number): Promise<void> {
    return new Promise((resolver, rechazar) => {
      canal.sendToQueue(COLA_REINTENTOS, mensaje.content, { persistent: true, headers: { intento } },
        error => error ? rechazar(error) : resolver());
    });
  }
}
