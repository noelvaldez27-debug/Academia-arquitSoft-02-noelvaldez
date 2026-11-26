import { Pool } from 'pg';
import { PublicadorExamen } from '../aplicacion/publicador-examen.port';
import { RespuestasTemporales } from '../aplicacion/respuestas-temporales.port';

export class DespacharExamenes {
  constructor(
    private readonly pool: Pool,
    private readonly publicador: PublicadorExamen,
    private readonly temporales: RespuestasTemporales,
  ) {}

  async ejecutar(limite: number): Promise<void> {
    const { rows } = await this.pool.query<{ id: string; publicado: boolean }>(
      'SELECT examen_id AS id, publicado FROM envios_examen_finalizado ORDER BY publicado, examen_id LIMIT $1',
      [limite],
    );
    const porPublicar = rows.filter(fila => !fila.publicado).map(fila => fila.id);
    const publicarLote = this.publicador.publicarLote?.bind(this.publicador);
    if (publicarLote && porPublicar.length) {
      await publicarLote(porPublicar);
      await this.pool.query(
        'UPDATE envios_examen_finalizado SET publicado = true WHERE examen_id = ANY($1::text[])',
        [porPublicar],
      );
    }
    for (const { id, publicado } of rows) {
      if (!publicado && !publicarLote) {
        await this.publicador.publicar(id);
        await this.pool.query('UPDATE envios_examen_finalizado SET publicado = true WHERE examen_id = $1', [id]);
      }
      try {
        await this.temporales.limpiar(id);
        await this.pool.query('DELETE FROM envios_examen_finalizado WHERE examen_id = $1', [id]);
      } catch {
        // El envío confirmado conserva su fila hasta que Redis pueda limpiarse.
      }
    }
  }
}
