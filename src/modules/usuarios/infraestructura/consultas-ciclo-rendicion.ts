import type { Pool } from 'pg';
import { PostgresRegistroCiclo } from './postgres-registro-ciclo';

export function crearConsultasCicloParaRendicion(bd: Pick<Pool, 'query'>) {
  return {
    bloquearAbierto: (cicloId: string) => new PostgresRegistroCiclo(bd).verificarAbierto(cicloId),
    async habilitados(cicloId: string) {
      const { rows } = await bd.query<{ postulanteId: string; sedeId: string; carrera: string; condicion: 'MATRICULADO' | 'LIBRE' | null }>(
        `SELECT u.id::text AS "postulanteId", u.sede_id::text AS "sedeId", u.carrera, u.condicion
         FROM postulantes_ciclo pc JOIN usuarios u ON u.id = pc.postulante_id
         WHERE pc.ciclo_id = $1 AND pc.desvinculado_en IS NULL AND u.activo AND u.rol = 'POSTULANTE'`, [cicloId],
      );
      return rows;
    },
    async sigueVinculado(cicloId: string, id: string) {
      const { rows } = await bd.query(
        `SELECT 1 FROM postulantes_ciclo WHERE ciclo_id = $1 AND postulante_id = $2 AND desvinculado_en IS NULL`,
        [cicloId, id],
      );
      return rows.length > 0;
    },
  };
}
