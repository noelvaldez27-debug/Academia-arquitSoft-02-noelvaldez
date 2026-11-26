import type { Pool } from 'pg';
import { AlcanceAdministrador, ErrorAccesoDenegado, ErrorConflicto, ErrorNoEncontrado, ErrorValidacion, RolUsuario, Usuario } from '../dominio';
import type { EmisionProvisional } from '../dominio/emision-provisional';
import type { EjecutorAccion } from '../aplicacion/registrar-estudiante.command';
import { PostgresUsuarioRepository } from './postgres-usuario-repository';

export class PostgresRegistroCiclo {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async verificarAbierto(cicloId: string, enLote = false) {
    const { rows: [ciclo] } = await this.bd.query<{ cerrado: boolean }>(
      'SELECT cerrado_en IS NOT NULL AS cerrado FROM ciclos_academicos WHERE id = $1 FOR SHARE', [cicloId],
    );
    if (!ciclo) throw new ErrorNoEncontrado('Ciclo académico no encontrado.');
    if (ciclo.cerrado) {
      if (enLote) throw new ErrorValidacion('El ciclo académico está cerrado.');
      throw new ErrorConflicto('El ciclo académico está cerrado.');
    }
  }

  async guardar(cicloId: string, postulante: Usuario, actor: EjecutorAccion, emision: EmisionProvisional) {
    await this.verificarAbierto(cicloId, Boolean(emision.cargaId));
    const { rows: [responsable] } = await this.bd.query<{ alcance: string; sedeId: string | null }>(
      `SELECT alcance_administrador AS alcance, sede_id::text AS "sedeId" FROM usuarios
       WHERE id = $1 AND activo AND rol = 'ADMINISTRADOR' FOR SHARE`, [actor.id],
    );
    if (!responsable || (responsable.alcance !== 'GENERAL' &&
        (responsable.alcance !== 'SEDE' || responsable.sedeId !== postulante.sedeId))) {
      throw new ErrorAccesoDenegado('El administrador no puede registrar postulantes en esa sede.');
    }
    const { rows: [actual] } = await this.bd.query<{ id: string; rol: string; activo: boolean; sedeId: string | null }>(
      'SELECT id::text, rol, activo, sede_id::text AS "sedeId" FROM usuarios WHERE dni = $1 FOR UPDATE', [postulante.dni],
    );
    const usuarios = new PostgresUsuarioRepository(this.bd, true);
    let id: string;
    if (actual) {
      if (responsable.alcance === AlcanceAdministrador.Sede && actual.sedeId !== responsable.sedeId) {
        throw new ErrorAccesoDenegado('El DNI no se puede gestionar en su sede.');
      }
      if (actual.rol !== RolUsuario.Postulante || actual.activo) {
        throw new ErrorConflicto('El DNI ya se encuentra registrado.');
      }
      const { rows: [membresia] } = await this.bd.query<{ cicloId: string }>(
        `SELECT ciclo_id::text AS "cicloId" FROM postulantes_ciclo
         WHERE postulante_id = $1 AND desvinculado_en IS NULL`, [actual.id],
      );
      if (membresia && membresia.cicloId !== cicloId) {
        throw new ErrorValidacion('El postulante pertenece a otro ciclo activo.');
      }
      id = actual.id;
      await this.bd.query(
        `WITH recuperado AS (
           UPDATE usuarios SET nombre = $2, sede_id = $3, carrera = $4, password_hash = $5,
             password_provisional_hasta = now() + interval '24 hours', activo = true, actualizado_en = now()
           WHERE id = $1 RETURNING id, version_sesion, password_provisional_hasta
         ), entrega AS (
           INSERT INTO entregas_credenciales_usuarios (usuario_id, administrador_id, carga_id, referencia, version_sesion, vence)
           SELECT id, $6, $7, $8, version_sesion, password_provisional_hasta FROM recuperado
           ON CONFLICT (usuario_id) DO UPDATE SET administrador_id = excluded.administrador_id,
             carga_id = excluded.carga_id, referencia = excluded.referencia,
             version_sesion = excluded.version_sesion, vence = excluded.vence
         )
         INSERT INTO auditoria_postulantes (postulante_id, administrador_id, operacion)
         SELECT id, $6, 'RECUPERADO' FROM recuperado`,
        [id, postulante.nombre, postulante.sedeId, postulante.carrera, emision.passwordHash,
          actor.id, emision.cargaId ?? null, emision.referencia],
      );
    } else {
      id = (await usuarios.guardar(postulante, emision)).id!;
    }
    await this.bd.query(
      `INSERT INTO postulantes_ciclo (postulante_id, ciclo_id) VALUES ($1,$2)
       ON CONFLICT (postulante_id,ciclo_id) DO UPDATE SET desvinculado_en = NULL`, [id, cicloId],
    );
    return { usuario: (await usuarios.buscarPorId(id))!, recuperado: Boolean(actual) };
  }
}

export async function enTransaccionUsuarios<T>(pool: Pool, operar: (bd: Pick<Pool, 'query'>) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await operar(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    cliente.release();
  }
}
