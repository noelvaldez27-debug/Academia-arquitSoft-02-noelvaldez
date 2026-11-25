import { Pool } from 'pg';
import { Resultado } from '../dominio/resultado';
import { ResultadoRepository } from '../dominio/resultado-repository';

const columnas = `examen_id AS "examenId", postulante_id AS "postulanteId", simulacro_id AS "simulacroId",
  puntaje_centesimos AS "puntajeCentesimos", correctas, incorrectas, omitidas, por_curso AS "porCurso", detalle`;

export class PostgresResultadoRepository implements ResultadoRepository {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async totalesPorSimulacro() {
    const { rows } = await this.bd.query<{ id: string; total: number }>(
      'SELECT simulacro_id AS id, count(*)::int AS total FROM resultados_examen GROUP BY simulacro_id',
    );
    return rows;
  }

  async contarCalificados(ids: string[]): Promise<number> {
    const { rows } = await this.bd.query<{ total: number }>(
      'SELECT count(*)::int AS total FROM resultados_examen WHERE examen_id = ANY($1::text[])', [ids],
    );
    return rows[0].total;
  }

  async existePorExamen(id: string): Promise<boolean> {
    const { rows } = await this.bd.query('SELECT 1 FROM resultados_examen WHERE examen_id = $1', [id]);
    return rows.length > 0;
  }

  async guardarSiNoExiste(resultado: Resultado): Promise<void> {
    const { examenId, postulanteId, simulacroId, puntajeCentesimos, correctas, incorrectas, omitidas, porCurso, detalle } = resultado;
    await this.bd.query(
      `INSERT INTO resultados_examen
       (examen_id, postulante_id, simulacro_id, puntaje_centesimos, correctas, incorrectas, omitidas, por_curso, detalle)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (examen_id) DO NOTHING`,
      [examenId, postulanteId, simulacroId, puntajeCentesimos, correctas, incorrectas, omitidas,
        JSON.stringify(porCurso), JSON.stringify(detalle)],
    );
  }

  async buscar(id: string): Promise<Resultado | null> {
    const { rows } = await this.bd.query<Resultado>(
      `SELECT ${columnas} FROM resultados_examen WHERE examen_id = $1`, [id],
    );
    return rows[0] ?? null;
  }

  async listar(campo: 'simulacro_id' | 'postulante_id', id: string, despues = ''): Promise<Resultado[]> {
    const columna = campo === 'simulacro_id' ? 'simulacro_id' : 'postulante_id';
    const { rows } = await this.bd.query<Resultado>(
      `SELECT ${columnas} FROM resultados_examen WHERE ${columna} = $1 AND examen_id > $2 ORDER BY examen_id LIMIT 100`,
      [id, despues],
    );
    return rows;
  }
}
