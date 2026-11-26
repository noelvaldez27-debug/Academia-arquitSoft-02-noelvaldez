import type { Pool } from 'pg';
import { ErrorAccesoDenegado, ErrorConflicto, ErrorNoEncontrado } from '../dominio';
import type { EjecutorAccion } from '../aplicacion/registrar-estudiante.command';

export type ConsultarActivos = (bd: Pick<Pool, 'query'>, postulantes: string[]) => Promise<boolean>;

export class PostgresArchivarPostulantes {
  constructor(private readonly pool: Pool, private readonly consultarActivos: ConsultarActivos) {}

  async ejecutar(actor: EjecutorAccion, ids: string[]) {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const { rows: [responsable] } = await cliente.query<{ rol: string; activo: boolean; alcance: string; sede: number | null }>(
        `SELECT rol, activo, alcance_administrador AS alcance, sede_id AS sede
         FROM usuarios WHERE id = $1 FOR SHARE`, [actor.id],
      );
      if (!responsable?.activo || responsable.rol !== 'ADMINISTRADOR' ||
          !['SEDE', 'GENERAL'].includes(responsable.alcance)) {
        throw new ErrorAccesoDenegado('Operación reservada a administradores autorizados.');
      }
      const { rows } = await cliente.query<{ id: string; rol: string; sede: number | null; activo: boolean }>(
        `SELECT id::text, rol, sede_id AS sede, activo FROM usuarios
         WHERE id = ANY($1::integer[]) AND rol = 'POSTULANTE' ORDER BY usuarios.id FOR UPDATE`, [ids],
      );
      if (rows.length !== ids.length) throw new ErrorNoEncontrado('Uno o más postulantes no existen.');
      if (responsable.alcance === 'SEDE' && rows.some(fila => fila.sede !== responsable.sede)) {
        throw new ErrorAccesoDenegado('Uno o más postulantes están fuera de su sede.');
      }
      const activos = rows.filter(fila => fila.activo).map(fila => fila.id);
      if (activos.length) {
        if (await this.consultarActivos(cliente, activos)) {
          throw new ErrorConflicto('Hay intentos activos. Espera su cierre antes de archivar.');
        }
        await cliente.query(
          `WITH archivados AS (
             UPDATE usuarios SET activo = false, actualizado_en = now()
             WHERE id = ANY($1::integer[]) AND activo RETURNING id
           )
           INSERT INTO auditoria_postulantes (postulante_id, administrador_id, operacion)
           SELECT id, $2, 'ARCHIVADO' FROM archivados`, [activos, actor.id],
        );
        await cliente.query(
          'UPDATE postulantes_ciclo SET desvinculado_en = now() WHERE postulante_id = ANY($1::integer[]) AND desvinculado_en IS NULL',
          [activos],
        );
      }
      await cliente.query('COMMIT');
      return { archivados: activos.length };
    } catch (error) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      cliente.release();
    }
  }
}

export function crearConsultaPostulanteHabilitado(bd: Pick<Pool, 'query'>) {
  return async (id: string) => {
    const { rows } = await bd.query<{ carrera: string; sedeId: string; condicion: 'LIBRE' | 'MATRICULADO' | null }>(
      `SELECT carrera, sede_id::text AS "sedeId", condicion FROM usuarios WHERE id = $1 AND rol = 'POSTULANTE' AND activo
       AND password_provisional_hasta IS NULL FOR SHARE`, [id],
    );
    return rows[0] ?? null;
  };
}
