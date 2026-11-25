import type { ChannelModel, ConfirmChannel } from 'amqplib';
import { setTimeout as esperar } from 'node:timers/promises';

const cola = 'ranking.actualizar';

export class RankingWorker {
  constructor(
    private readonly conectar: () => Promise<ChannelModel>,
    private readonly pendientes: () => Promise<string[]>,
    private readonly actualizar: (id: string) => Promise<void>,
    private readonly informar: (error: unknown) => void,
    private readonly pausa: (ms: number) => Promise<unknown> = esperar,
  ) {}

  async ejecutar(): Promise<never> {
    for (;;) {
      try {
        await this.sesion();
      } catch (error) {
        this.informar(error);
      }
      await this.pausa(2000);
    }
  }

  async sesion(): Promise<void> {
    const conexion = await this.conectar();
    let activa = true;
    const terminar = () => { activa = false; };
    conexion.on('error', terminar);
    conexion.once('close', terminar);
    try {
      const canal = await conexion.createConfirmChannel();
      canal.on('error', terminar);
      canal.once('close', terminar);
      await canal.assertQueue(cola, { durable: true });
      await canal.prefetch(1);
      const enVuelo = new Map<string, number>();
      await canal.consume(cola, mensaje => {
        if (!mensaje) { terminar(); return; }
        const id = mensaje.content.toString('utf8');
        if (!id || id.length > 200) { canal.nack(mensaje, false, false); return; }
        void this.actualizar(id).then(() => canal.ack(mensaje), error => {
          this.informar(error);
          // Los datos persistidos siguen pendientes y se vuelven a detectar.
          canal.nack(mensaje, false, false);
        }).catch(terminar).finally(() => enVuelo.delete(id));
      });
      while (activa) {
        const ids = new Set(await this.pendientes());
        const ahora = Date.now();
        for (const [id, vence] of enVuelo) {
          if (!ids.has(id) || vence <= ahora) enVuelo.delete(id);
        }
        for (const id of ids) {
          if (!activa) break;
          if (enVuelo.has(id)) continue;
          enVuelo.set(id, ahora + 30_000);
          await publicar(canal, id);
        }
        await this.pausa(2000);
      }
    } finally {
      await conexion.close().catch(() => undefined);
    }
  }
}

function publicar(canal: ConfirmChannel, id: string): Promise<void> {
  return new Promise((resolver, rechazar) => {
    canal.sendToQueue(cola, Buffer.from(id, 'utf8'), { persistent: true, contentType: 'text/plain' },
      error => error ? rechazar(error) : resolver());
  });
}
