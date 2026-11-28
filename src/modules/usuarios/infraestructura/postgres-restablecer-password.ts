import type { Pool } from 'pg';
import type { RestablecerPasswordPort } from '../aplicacion/restablecer-password.port';

export class PostgresRestablecerPassword implements RestablecerPasswordPort {
  constructor(private readonly pool: Pool) {}

  async ejecutar(targetId: string, actorId: string, passwordHash: string): Promise<Date | null> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const { rows: [actor] } = await cliente.query<{ alcance: string; sedeId: string | null }>(
        `SELECT alcance_administrador AS alcance, sede_id::text AS "sedeId"
         FROM usuarios WHERE id = $1::integer AND activo AND rol = 'ADMINISTRADOR' FOR SHARE`, [actorId],
      );
      const { rows: [estudiante] } = await cliente.query<{ sedeId: string | null }>(
        `SELECT sede_id::text AS "sedeId" FROM usuarios
         WHERE id = $1::integer AND activo AND rol = 'POSTULANTE' FOR UPDATE`, [targetId],
      );
      const autorizado = actor?.alcance === 'GENERAL' ||
        (actor?.alcance === 'SEDE' && Boolean(actor.sedeId) && actor.sedeId === estudiante?.sedeId);
      if (!estudiante || !autorizado) {
        await cliente.query('ROLLBACK');
        return null;
      }
      const { rows: [resultado] } = await cliente.query<{ venceEn: Date }>(
        `WITH actualizado AS (
           UPDATE usuarios SET password_hash = $2,
             password_provisional_hasta = now() + interval '24 hours',
             password_cambio_obligatorio = true,
             password_cambio_motivo = 'RESTABLECIMIENTO_ADMINISTRATIVO',
             version_sesion = version_sesion + 1, actualizado_en = now()
           WHERE id = $1::integer AND activo AND rol = 'POSTULANTE'
           RETURNING id, password_provisional_hasta AS "venceEn"
         ), auditoria AS (
           INSERT INTO auditoria_credenciales_usuarios (usuario_id, actor_id, evento)
           SELECT id, $3::integer, 'RESTABLECIMIENTO_ADMINISTRATIVO' FROM actualizado
         ) SELECT "venceEn" FROM actualizado`, [targetId, passwordHash, actorId],
      );
      if (!resultado) {
        await cliente.query('ROLLBACK');
        return null;
      }
      await cliente.query('COMMIT');
      return resultado.venceEn;
    } catch (error) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      cliente.release();
    }
  }
}
