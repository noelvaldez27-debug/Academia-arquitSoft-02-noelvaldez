import type { Pool } from 'pg';
import { ErrorRendicion } from '../dominio/error-rendicion';

export interface HabilitadoSimulacro {
  postulanteId: string;
  sedeId: string;
  carrera: string;
  condicion: 'MATRICULADO' | 'LIBRE' | null;
}

interface Padron {
  cicloId: string;
  habilitadoEn: Date;
}

export class PostgresPadronSimulacro {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async encabezado(simulacroId: string): Promise<Padron | null> {
    const { rows } = await this.bd.query<Padron>(
      `SELECT ciclo_id::text AS "cicloId", habilitado_en AS "habilitadoEn"
       FROM padrones_simulacro_rendicion WHERE simulacro_id = $1`, [simulacroId],
    );
    return rows[0] ?? null;
  }

  async consolidar(simulacroId: string, cicloId: string, actorId: string, habilitados: HabilitadoSimulacro[]) {
    const previo = await this.encabezado(simulacroId);
    if (previo) {
      if (previo.cicloId !== cicloId) throw new ErrorRendicion('conflicto', 'El simulacro ya pertenece a otro ciclo.');
      return previo;
    }
    const { rows: [padron] } = await this.bd.query<Padron>(
      `INSERT INTO padrones_simulacro_rendicion (simulacro_id,ciclo_id,administrador_id) VALUES ($1,$2,$3)
       RETURNING ciclo_id::text AS "cicloId", habilitado_en AS "habilitadoEn"`, [simulacroId, cicloId, actorId],
    );
    await this.bd.query(
      `INSERT INTO habilitados_simulacro_rendicion (simulacro_id,postulante_id,sede_id,carrera,condicion)
       SELECT $1, p."postulanteId",p."sedeId",p.carrera,p.condicion
       FROM jsonb_to_recordset($2::jsonb) p("postulanteId" text,"sedeId" text,carrera text,condicion text)`,
      [simulacroId, JSON.stringify(habilitados)],
    );
    return padron;
  }

  async miembro(simulacroId: string, postulanteId: string): Promise<HabilitadoSimulacro | null> {
    const { rows } = await this.bd.query<HabilitadoSimulacro>(
      `SELECT postulante_id AS "postulanteId", sede_id AS "sedeId", carrera, condicion
       FROM habilitados_simulacro_rendicion WHERE simulacro_id = $1 AND postulante_id = $2`,
      [simulacroId, postulanteId],
    );
    return rows[0] ?? null;
  }

  async listar(simulacroId: string): Promise<HabilitadoSimulacro[] | null> {
    if (!await this.encabezado(simulacroId)) return null;
    const { rows } = await this.bd.query<HabilitadoSimulacro>(
      `SELECT postulante_id AS "postulanteId", sede_id AS "sedeId", carrera, condicion
       FROM habilitados_simulacro_rendicion WHERE simulacro_id = $1`, [simulacroId],
    );
    return rows;
  }
}

export async function tieneSimulacrosPorCerrar(bd: Pick<Pool, 'query'>, cicloId: string): Promise<boolean> {
  const { rows } = await bd.query(
    `SELECT 1 FROM padrones_simulacro_rendicion p
     LEFT JOIN cierres_simulacro_rendicion c ON c.simulacro_id = p.simulacro_id
     WHERE p.ciclo_id = $1 AND c.cerrado_en IS NULL LIMIT 1`, [cicloId],
  );
  return rows.length > 0;
}
