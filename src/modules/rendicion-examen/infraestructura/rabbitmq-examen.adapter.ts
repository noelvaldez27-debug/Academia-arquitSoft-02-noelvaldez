import { ChannelModel } from 'amqplib';
import { PublicadorExamen } from '../aplicacion/publicador-examen.port';

export class RabbitmqExamenAdapter implements PublicadorExamen {
  constructor(private readonly conectar: () => Promise<ChannelModel>) {}

  async publicar(examenId: string): Promise<void> {
    await this.publicarLote([examenId]);
  }

  async publicarLote(examenes: string[]): Promise<void> {
    if (!examenes.length) return;
    const conexion = await this.conectar();
    conexion.on('error', () => { /* El canal rechaza la confirmación pendiente. */ });
    try {
      const canal = await conexion.createConfirmChannel();
      canal.on('error', () => { /* La publicación queda pendiente para el reintento. */ });
      await canal.assertQueue('examen.finalizado', { durable: true });
      for (const examenId of examenes) {
        canal.sendToQueue('examen.finalizado', Buffer.from(JSON.stringify({ tipo: 'ExamenFinalizado', examenId })), {
          persistent: true, contentType: 'application/json', messageId: examenId,
        });
      }
      await canal.waitForConfirms();
    } finally {
      await conexion.close().catch(() => undefined);
    }
  }
}
