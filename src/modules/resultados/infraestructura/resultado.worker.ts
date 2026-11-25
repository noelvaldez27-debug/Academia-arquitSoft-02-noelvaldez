import { ChannelModel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { setTimeout as esperar } from 'node:timers/promises';

const cola = 'examen.finalizado';
const fallos = cola + '.fallos';
const maxReintentos = 3;

function examenId(mensaje: ConsumeMessage): string | null {
  try {
    const evento = JSON.parse(mensaje.content.toString());
    return evento?.tipo === 'ExamenFinalizado' && typeof evento.examenId === 'string' &&
      /^[A-Za-z0-9_-]{1,80}$/.test(evento.examenId) ? evento.examenId : null;
  } catch {
    return null;
  }
}

export class ResultadoWorker {
  constructor(
    private readonly conectar: () => Promise<ChannelModel>,
    private readonly procesar: (id: string) => Promise<void>,
    private readonly informar: (mensaje: string, id?: string) => void,
    private readonly pausa: (ms: number) => Promise<unknown> = esperar,
  ) {}

  async ejecutar(): Promise<never> {
    for (;;) {
      try {
        await this.consumirSesion();
      } catch {
        this.informar('Conexión del worker de resultados interrumpida.');
      }
      await this.pausa(1000);
    }
  }

  async consumirSesion(): Promise<void> {
    const conexion = await this.conectar();
    let terminar!: () => void;
    const fin = new Promise<void>(resolver => { terminar = resolver; });
    conexion.on('error', terminar);
    conexion.once('close', terminar);
    try {
      const canal = await conexion.createConfirmChannel();
      canal.on('error', terminar);
      canal.once('close', terminar);
      // La cola principal ya existe con esta configuración en Rendición.
      await canal.assertQueue(cola, { durable: true });
      await canal.assertQueue(fallos, { durable: true });
      await canal.prefetch(8);
      await canal.consume(cola, mensaje => {
        if (!mensaje) terminar();
        else void this.consumir(canal, mensaje).catch(terminar);
      });
      await fin;
    } finally {
      // Al cerrar la conexión el broker recupera las entregas aún sin confirmar.
      await conexion.close().catch(() => undefined);
    }
  }

  async consumir(canal: ConfirmChannel, mensaje: ConsumeMessage): Promise<void> {
    const id = examenId(mensaje);
    const intento: unknown = mensaje.properties.headers?.intento ?? 0;
    if (!id || typeof intento !== 'number' || !Number.isInteger(intento) || intento < 0 || intento > maxReintentos) {
      this.informar('Evento de examen inválido.');
      await this.republicar(canal, mensaje, fallos, maxReintentos);
      canal.ack(mensaje);
      return;
    }
    try {
      await this.procesar(id);
    } catch {
      this.informar('No se pudo procesar un examen finalizado.', id);
      const agotado = intento === maxReintentos;
      if (!agotado) await this.pausa(1000 * (intento + 1));
      await this.republicar(canal, mensaje, agotado ? fallos : cola, agotado ? intento : intento + 1);
    }
    canal.ack(mensaje);
  }

  private republicar(canal: ConfirmChannel, mensaje: ConsumeMessage, destino: string, intento: number): Promise<void> {
    return new Promise((resolver, rechazar) => {
      canal.sendToQueue(destino, mensaje.content, {
        persistent: true, contentType: 'application/json', messageId: mensaje.properties.messageId, headers: { intento },
      }, error => error ? rechazar(error) : resolver());
    });
  }
}
