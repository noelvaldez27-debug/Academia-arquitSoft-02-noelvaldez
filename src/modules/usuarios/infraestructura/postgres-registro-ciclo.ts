import type { Pool } from 'pg';
import { AlcanceAdministrador, ErrorAccesoDenegado, ErrorConflicto, ErrorNoEncontrado, ErrorValidacion, RolUsuario, Usuario } from '../dominio';
import type { EmisionProvisional } from '../dominio/emision-provisional';
import type { CondicionPostulante } from '../dominio/usuario';
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

  async ejecutarAutomaticoDesdeDatos(cicloId: string,
    datos: { nombre: string; dni: string; sedeId: string; carrera: string; condicion: CondicionPostulante | null },
    actor: EjecutorAccion, emitirCredenciales: (tipo: 'INICIAL' | 'RECUPERACION') => Promise<EmisionProvisional>) {
    await this.verificarAbierto(cicloId, true);
    const { rows: [responsable] } = await this.bd.query<{ alcance: string; sedeId: string | null }>(
      `SELECT alcance_administrador AS alcance, sede_id::text AS "sedeId" FROM usuarios
       WHERE id = $1 AND activo AND rol = 'ADMINISTRADOR' FOR SHARE`, [actor.id],
    );
    if (!responsable || (responsable.alcance !== 'GENERAL' &&
        (responsable.alcance !== 'SEDE' || responsable.sedeId !== datos.sedeId))) {
      throw new ErrorAccesoDenegado('El administrador no puede registrar postulantes en esa sede.');
    }
    // Serializa también la creación cuando todavía no hay una fila de usuario que bloquear.
    await this.bd.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [datos.dni]);
    const { rows: [actual] } = await this.bd.query<{ id: string; nombre: string; sedeId: string; activo: boolean; rol: string;
      alcance: string | null }>(
      `SELECT id::text, nombre, sede_id::text AS "sedeId", activo, rol, alcance_administrador AS alcance
       FROM usuarios WHERE dni = $1 FOR UPDATE`, [datos.dni],
    );
    const usuarios = new PostgresUsuarioRepository(this.bd, true);
    if (actual) {
      if (actual.rol !== RolUsuario.Postulante) throw new ErrorConflicto('El DNI ya se encuentra registrado.');
      if (normalizarNombre(actual.nombre) !== normalizarNombre(datos.nombre)) {
        throw new ErrorConflicto('El DNI existente presenta una discrepancia de identidad. Requiere revisión manual.');
      }
      if (responsable.alcance === AlcanceAdministrador.Sede && actual.sedeId !== responsable.sedeId) {
        throw new ErrorAccesoDenegado('El DNI no se puede gestionar en su sede.');
      }
      const { rows: [membresia] } = await this.bd.query<{ cicloId: string }>(
        `SELECT ciclo_id::text AS "cicloId" FROM postulantes_ciclo
         WHERE postulante_id = $1 AND desvinculado_en IS NULL FOR UPDATE`, [actual.id],
      );
      if (membresia?.cicloId === cicloId) return { usuario: await usuarioRequerido(usuarios, actual.id), resultado: 'existente' as const };
      if (membresia) throw new ErrorValidacion('El postulante pertenece a otro ciclo activo.');
      if (actual.sedeId !== datos.sedeId) throw new ErrorValidacion('La sede no coincide con la cuenta existente.');
      if (actual.activo) {
        await this.bd.query('INSERT INTO postulantes_ciclo (postulante_id,ciclo_id) VALUES ($1,$2)', [actual.id, cicloId]);
        await this.bd.query(`INSERT INTO auditoria_postulantes (postulante_id,administrador_id,operacion)
          VALUES ($1,$2,'VINCULADO')`, [actual.id, actor.id]);
        return { usuario: await usuarioRequerido(usuarios, actual.id), resultado: 'vinculada' as const };
      }
      const { rows: [elegible] } = await this.bd.query<{ elegible: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM auditoria_postulantes a WHERE a.postulante_id = $1 AND a.operacion = 'ARCHIVADO'
          AND NOT EXISTS (SELECT 1 FROM auditoria_postulantes r WHERE r.postulante_id = a.postulante_id
            AND r.operacion = 'RECUPERADO' AND r.id > a.id)) AS elegible`, [actual.id],
      );
      if (actual.alcance || !elegible?.elegible) throw new ErrorConflicto('La cuenta inactiva no es elegible para recuperación académica.');
      const emision = await emitirCredenciales('RECUPERACION');
      await this.bd.query(`WITH recuperado AS (
          UPDATE usuarios SET password_hash = $2, password_provisional_hasta = now() + interval '24 hours',
            activo = true, version_sesion = version_sesion + 1, actualizado_en = now()
          WHERE id = $1 RETURNING id, version_sesion, password_provisional_hasta
        ), entrega AS (
          INSERT INTO entregas_credenciales_usuarios (usuario_id, administrador_id, carga_id, referencia, version_sesion, vence)
          SELECT id, $3, $4, $5, version_sesion, password_provisional_hasta FROM recuperado
          ON CONFLICT (usuario_id) DO UPDATE SET administrador_id=excluded.administrador_id,
            carga_id=excluded.carga_id, referencia=excluded.referencia, version_sesion=excluded.version_sesion, vence=excluded.vence
        ) INSERT INTO auditoria_postulantes (postulante_id,administrador_id,operacion)
          SELECT id,$3,'RECUPERADO' FROM recuperado`,
        [actual.id, emision.passwordHash, actor.id, emision.cargaId ?? null, emision.referencia]);
      await this.bd.query('INSERT INTO postulantes_ciclo (postulante_id,ciclo_id) VALUES ($1,$2)', [actual.id, cicloId]);
      return { usuario: await usuarioRequerido(usuarios, actual.id), resultado: 'recuperada' as const };
    }
    const emision = await emitirCredenciales('INICIAL');
    const postulante = Usuario.crearPostulante({
      nombre: datos.nombre, dni: datos.dni, correo: `${datos.dni}@sofia.edu`,
      passwordHash: emision.passwordHash, sedeId: datos.sedeId, carrera: datos.carrera, condicion: datos.condicion,
    });
    const nuevo = await usuarios.guardar(postulante, emision);
    await this.bd.query('INSERT INTO postulantes_ciclo (postulante_id,ciclo_id) VALUES ($1,$2)', [nuevo.id, cicloId]);
    return { usuario: nuevo, resultado: 'creada' as const };
  }
}

async function usuarioRequerido(usuarios: PostgresUsuarioRepository, id: string): Promise<Usuario> {
  const usuario = await usuarios.buscarPorId(id);
  if (!usuario) throw new ErrorConflicto('No se pudo confirmar la cuenta después de actualizar el ciclo.');
  return usuario;
}

function normalizarNombre(nombre: string): string {
  return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
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
