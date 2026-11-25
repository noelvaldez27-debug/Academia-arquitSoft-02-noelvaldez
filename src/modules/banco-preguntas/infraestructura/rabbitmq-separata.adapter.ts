import { ConfirmChannel } from 'amqplib';
import { Pool } from 'pg';
import { transaccionBanco } from './transaccion-banco';

export const COLA_SEPARATAS = 'banco-preguntas.separata-subida';

export class RabbitmqSeparataAdapter {
  constructor(private readonly pool: Pool) {}

  async publicarPendiente(canal: ConfirmChannel): Promise<void> {
    await transaccionBanco(this.pool, async bd => {
      const { rows } = await bd.query<{ separata_id: string }>(
        `SELECT separata_id FROM envios_separata WHERE NOT publicado ORDER BY separata_id
         LIMIT 1 FOR UPDATE SKIP LOCKED`,
      );
      if (!rows[0]) return;
      const separataId = rows[0].separata_id;
      await new Promise<void>((resolver, rechazar) => {
        canal.sendToQueue(COLA_SEPARATAS, Buffer.from(JSON.stringify({ separataId })),
          { persistent: true }, error => error ? rechazar(error) : resolver());
      });
      await bd.query('UPDATE envios_separata SET publicado = true WHERE separata_id = $1', [separataId]);
    });
  }
}
