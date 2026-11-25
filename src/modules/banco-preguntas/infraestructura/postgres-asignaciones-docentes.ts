import type { Pool } from 'pg';

export class PostgresAsignacionesDocentes {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async guardar(docente: string, curso: string, asignado: boolean): Promise<void> {
    await this.bd.query(asignado
      ? 'INSERT INTO asignaciones_docentes_banco (docente_id, curso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING'
      : 'DELETE FROM asignaciones_docentes_banco WHERE docente_id = $1 AND curso_id = $2', [docente, curso]);
  }

  async porDocente(docente: string): Promise<string[]> {
    const { rows } = await this.bd.query<{ cursoId: string }>(
      'SELECT curso_id AS "cursoId" FROM asignaciones_docentes_banco WHERE docente_id = $1 ORDER BY curso_id', [docente],
    );
    return rows.map(({ cursoId }) => cursoId);
  }
}
