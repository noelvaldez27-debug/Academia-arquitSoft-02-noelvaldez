import type { Pool } from 'pg';
import type { OpcionRendicion } from '../aplicacion/listar-simulacros.use-case';

export function consultarOpcionesRendicion(bd: Pick<Pool, 'query'>) {
  return async (postulanteId: string): Promise<OpcionRendicion[]> => (await bd.query<OpcionRendicion>(
    `SELECT e.simulacro_id AS "simulacroId", e.id AS "intentoId", p.ciclo_id::text AS "cicloId",
            p.habilitado_en AS "habilitadoEn", e.cierre
       FROM examenes_rendicion e
       LEFT JOIN padrones_simulacro_rendicion p ON p.simulacro_id = e.simulacro_id
      WHERE e.postulante_id = $1
     UNION ALL
     SELECT p.simulacro_id, NULL::text, p.ciclo_id::text, p.habilitado_en, NULL::timestamptz
       FROM habilitados_simulacro_rendicion h
       JOIN padrones_simulacro_rendicion p ON p.simulacro_id = h.simulacro_id
      WHERE h.postulante_id = $1
        AND NOT EXISTS (SELECT 1 FROM examenes_rendicion e WHERE e.postulante_id = $1 AND e.simulacro_id = h.simulacro_id)
        AND NOT EXISTS (SELECT 1 FROM cierres_simulacro_rendicion c WHERE c.simulacro_id = h.simulacro_id)
      ORDER BY "habilitadoEn" DESC NULLS LAST, "simulacroId"`, [postulanteId],
  )).rows;
}
