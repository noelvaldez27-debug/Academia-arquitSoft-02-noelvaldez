import type { Pool } from 'pg';
import type { ConsultaHistorialCredencialesPort, EventoCredencial } from '../aplicacion/consultar-historial-credenciales.port';

interface FilaEvento { id: string; evento: string; creadoEn: Date | string; actorId: string; actorNombre: string }

export class PostgresConsultarHistorialCredenciales implements ConsultaHistorialCredencialesPort {
  constructor(private readonly pool: Pool) {}

  async consultar(targetId: string, actorId: string, pagina: number, limite: number) {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const { rows: [estado] } = await cliente.query<{ cambioObligatorio: boolean; venceEn: Date | null }>(
        `SELECT u.password_cambio_obligatorio AS "cambioObligatorio",
                u.password_provisional_hasta AS "venceEn"
         FROM usuarios a JOIN usuarios u ON u.id = $2::integer
         WHERE a.id = $1::integer AND a.activo AND a.rol = 'ADMINISTRADOR'
           AND u.rol = 'POSTULANTE'
           AND (a.alcance_administrador = 'GENERAL' OR
             (a.alcance_administrador = 'SEDE' AND a.sede_id IS NOT NULL AND a.sede_id = u.sede_id))`,
        [actorId, targetId],
      );
      if (!estado) {
        await cliente.query('ROLLBACK');
        return null;
      }
      const { rows: [conteo] } = await cliente.query<{ total: string }>(
        'SELECT count(*)::text AS total FROM auditoria_credenciales_usuarios WHERE usuario_id = $1::integer', [targetId],
      );
      const offset = (pagina - 1) * limite;
      const { rows } = await cliente.query<FilaEvento>(
        `SELECT h.id::text, h.evento, h.creado_en AS "creadoEn", a.id::text AS "actorId", a.nombre AS "actorNombre"
         FROM auditoria_credenciales_usuarios h JOIN usuarios a ON a.id = h.actor_id
         WHERE h.usuario_id = $1::integer ORDER BY h.id DESC LIMIT $2 OFFSET $3`, [targetId, limite, offset],
      );
      await cliente.query('COMMIT');
      const eventos: EventoCredencial[] = rows.map(fila => ({ id: fila.id, evento: fila.evento,
        creadoEn: new Date(fila.creadoEn).toISOString(), actor: { id: fila.actorId, nombre: fila.actorNombre } }));
      return { cambioObligatorio: estado.cambioObligatorio, venceEn: estado.venceEn?.toISOString() ?? null,
        eventos, total: Number(conteo?.total ?? 0) };
    } catch (error) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      cliente.release();
    }
  }
}
