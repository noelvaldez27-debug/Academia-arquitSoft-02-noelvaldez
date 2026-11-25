import type { ChannelModel, ConfirmChannel } from 'amqplib';
import { setTimeout as esperar } from 'node:timers/promises';

const cola = 'ranking.actualizar';

export class RankingWorker {
  constructor(
    private readonly conectar: () => Promise<ChannelModel>,
    private readonly pendientes: () => Promise<string[]>,
    private readonly actualizar: (id: string) => Promise<void>,
    private readonly informar: (error: unknown) => void,
  ) {}

  async ejecutar(): Promise<never> {
    for (;;) {
      try {
        await this.sesion();
      } catch (error) {
        this.informar(error);
      }
      await esperar(2000);
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
      const enVuelo = new Set<string>();
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
        for (const id of await this.pendientes()) {
          if (!activa) break;
          if (enVuelo.has(id)) continue;
          enVuelo.add(id);
          await publicar(canal, id);
        }
        await esperar(2000);
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
