import type { Pool } from 'pg';

export interface CierreSimulacro {
  administradorId: string;
  solicitadoEn: Date;
  cerradoEn: Date | null;
}

const columnas = 'administrador_id AS "administradorId", solicitado_en AS "solicitadoEn", cerrado_en AS "cerradoEn"';

export class PostgresCierreSimulacro {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async coordinarInicio(id: string): Promise<boolean> {
    await this.bloquear(id, true);
    return !!await this.consultar(id);
  }

  async solicitar(id: string, administradorId: string): Promise<CierreSimulacro> {
    await this.bloquear(id, false);
    await this.bd.query(
      'INSERT INTO cierres_simulacro_rendicion (simulacro_id, administrador_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, administradorId],
    );
    return (await this.consultar(id))!;
  }

  async consultar(id: string): Promise<CierreSimulacro | null> {
    const { rows } = await this.bd.query<CierreSimulacro>(
      `SELECT ${columnas} FROM cierres_simulacro_rendicion WHERE simulacro_id = $1`, [id],
    );
    return rows[0] ?? null;
  }

  async pendientes(): Promise<string[]> {
    const { rows } = await this.bd.query<{ id: string }>(
      'SELECT simulacro_id AS id FROM cierres_simulacro_rendicion WHERE cerrado_en IS NULL ORDER BY simulacro_id',
    );
    return rows.map(({ id }) => id);
  }

  async completar(id: string): Promise<void> {
    await this.bd.query(
      'UPDATE cierres_simulacro_rendicion SET cerrado_en = clock_timestamp() WHERE simulacro_id = $1 AND cerrado_en IS NULL',
      [id],
    );
  }

  private async bloquear(id: string, compartido: boolean): Promise<void> {
    const funcion = compartido ? 'pg_advisory_xact_lock_shared' : 'pg_advisory_xact_lock';
    await this.bd.query(`SELECT ${funcion}(hashtextextended($1, 16))`, [id]);
  }
}
