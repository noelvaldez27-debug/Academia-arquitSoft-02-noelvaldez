import type { Pool } from 'pg';
import type { ProyeccionRanking } from '../dominio/proyeccion-ranking';
import type { PersistenciaRanking } from '../aplicacion/actualizar-ranking.use-case';

export class PostgresRankingRepository implements PersistenciaRanking {
  constructor(private readonly pool: Pool) {}

  async reemplazar(id: string, construir: () => Promise<ProyeccionRanking>): Promise<void> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 17))', [id]);
      const datos = await construir();
      await cliente.query(
        `INSERT INTO proyecciones_ranking (simulacro_id, datos) VALUES ($1, $2)
         ON CONFLICT (simulacro_id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_en = clock_timestamp()
         WHERE proyecciones_ranking.datos IS DISTINCT FROM EXCLUDED.datos`,
        [id, JSON.stringify(datos)],
      );
      await cliente.query('COMMIT');
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }

  async consultar(id: string): Promise<ProyeccionRanking | null> {
    const { rows } = await this.pool.query<{ datos: ProyeccionRanking }>(
      'SELECT datos FROM proyecciones_ranking WHERE simulacro_id = $1', [id],
    );
    return rows[0]?.datos ?? null;
  }
}
