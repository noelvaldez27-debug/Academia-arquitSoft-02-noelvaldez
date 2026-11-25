import type { Pool } from 'pg';
import type { Recomendacion, RecomendacionRepository } from '../dominio/recomendacion';

interface Fila extends Omit<Recomendacion, 'generadaEn'> {
  generadaEn: Date;
}

export class PostgresRecomendacionRepository implements RecomendacionRepository {
  constructor(private readonly pool: Pool) {}

  async obtenerOCrear(postulanteId: string, huella: string, reglas: number,
    generar: () => Promise<Omit<Recomendacion, 'generadaEn'>>): Promise<Recomendacion> {
    const bd = await this.pool.connect();
    const clave = [postulanteId, huella, reglas];
    const columnas = 'cursos, contenido, origen, generada_en AS "generadaEn"';
    try {
      await bd.query('BEGIN');
      await bd.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [JSON.stringify(['recomendacion-analitica', ...clave])]);
      const { rows } = await bd.query<Fila>(
        `SELECT ${columnas} FROM recomendaciones_analitica
         WHERE postulante_id = $1 AND huella = $2 AND version_reglas = $3`, clave,
      );
      let fila = rows[0];
      if (!fila) {
        const { cursos, contenido, origen } = await generar();
        const insertado = await bd.query<Fila>(
          `INSERT INTO recomendaciones_analitica (postulante_id, huella, version_reglas, cursos, contenido, origen)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${columnas}`,
          [...clave, JSON.stringify(cursos), contenido, origen],
        );
        fila = insertado.rows[0];
      }
      await bd.query('COMMIT');
      return { ...fila, generadaEn: fila.generadaEn.toISOString() };
    } catch (error) {
      await bd.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      bd.release();
    }
  }
}
