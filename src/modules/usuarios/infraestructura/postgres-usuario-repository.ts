import { Pool } from 'pg';
import type { CondicionPostulante } from '../dominio/usuario';
import type { EmisionProvisional } from '../dominio/emision-provisional';
import {
  Usuario,
  UsuarioRepository,
  FiltrosListadoUsuarios,
  ResultadoPaginadoUsuarios,
  RolUsuario,
  AlcanceAdministrador,
  ErrorConflicto,
} from '../dominio';

interface FilaUsuario {
  id: number;
  nombre: string;
  dni: string | null;
  correo: string;
  password_hash: string;
  rol: string;
  activo: boolean;
  version_sesion: number;
  password_provisional_hasta: Date | null;
  password_cambio_obligatorio?: boolean;
  password_cambio_motivo?: Usuario['passwordCambioMotivo'];
  sede_id: number | null;
  carrera: string | null;
  condicion: Usuario['condicion'];
  alcance_administrador: string | null;
}

export class PostgresUsuarioRepository implements UsuarioRepository {
  constructor(private readonly pool: Pick<Pool, 'query'>, private readonly idempotente = false) {}

  async reactivarPostulanteAnterior(id: string, version: number) {
    const { rowCount } = await this.pool.query(
      `UPDATE usuarios SET activo = true, actualizado_en = now()
       WHERE id = $1 AND version_sesion = $2 AND rol = 'POSTULANTE' AND NOT activo
         AND NOT EXISTS (
           SELECT 1 FROM auditoria_postulantes WHERE postulante_id = $1 AND operacion = 'ARCHIVADO'
         )`, [id, version],
    );
    return rowCount === 1;
  }

  async cambiarCondicion(id: string, condicion: CondicionPostulante, sedeId: string | null): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE usuarios SET condicion = $2, actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $1 AND rol = 'POSTULANTE' AND ($3::integer IS NULL OR sede_id = $3)`,
      [id, condicion, sedeId],
    );
    return rowCount === 1;
  }

  private mapearFilaAUsuario(fila: FilaUsuario): Usuario {
    return new Usuario({
      id: String(fila.id),
      nombre: fila.nombre,
      dni: fila.dni,
      correo: fila.correo,
      passwordHash: fila.password_hash,
      rol: fila.rol as RolUsuario,
      activo: fila.activo,
      versionSesion: fila.version_sesion,
      passwordProvisionalHasta: fila.password_provisional_hasta,
      passwordCambioObligatorio: fila.password_cambio_obligatorio,
      passwordCambioMotivo: fila.password_cambio_motivo,
      sedeId: fila.sede_id !== null && fila.sede_id !== undefined ? String(fila.sede_id) : null,
      carrera: fila.carrera,
      condicion: fila.condicion,
      alcanceAdministrador: fila.alcance_administrador
        ? (fila.alcance_administrador as AlcanceAdministrador)
        : null,
    });
  }

  public async guardar(usuario: Usuario, emision?: EmisionProvisional): Promise<Usuario> {
    const sedeIdNumerico = usuario.sedeId ? parseInt(usuario.sedeId, 10) : null;

    const res = await this.pool.query<FilaUsuario>(
      `${emision ? 'WITH alta AS (' : ''}
       INSERT INTO usuarios (nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador, condicion
         ${emision ? ', password_provisional_hasta, password_cambio_obligatorio, password_cambio_motivo' : ''})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10 ${emision ? ", CASE WHEN $15 THEN now() + interval '24 hours' ELSE NULL END, $15, CASE WHEN $15 THEN 'CREDENCIAL_PROVISIONAL_EXISTENTE' ELSE NULL END" : ''})
       ${this.idempotente ? "ON CONFLICT DO NOTHING" : ""}
       RETURNING id, nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador, condicion,
         version_sesion, password_provisional_hasta, password_cambio_obligatorio, password_cambio_motivo
       ${emision ? `), entrega AS (
         INSERT INTO entregas_credenciales_usuarios (usuario_id, administrador_id, carga_id, referencia, version_sesion, vence, tipo_password)
         SELECT id, $11, $12, $13, version_sesion, now() + interval '24 hours', $14 FROM alta
       ), auditoria AS (
         INSERT INTO auditoria_credenciales_usuarios (usuario_id, actor_id, evento)
         SELECT id, $11, 'ASIGNACION_INICIAL' FROM alta
       ) SELECT * FROM alta` : ''};`,
      [
        usuario.nombre,
        usuario.dni || null,
        usuario.correo,
        usuario.passwordHash,
        usuario.rol,
        usuario.activo,
        sedeIdNumerico,
        usuario.carrera || null,
        usuario.alcanceAdministrador || null,
        usuario.condicion ?? null,
        ...(emision ? [emision.administradorId, emision.cargaId ?? null, emision.referencia,
          emision.tipoPassword ?? 'ALEATORIA', emision.requiereCambio ?? true] : []),
      ]
    );

    if (this.idempotente && res.rows.length === 0) {
      if (usuario.dni && await this.buscarPorDni(usuario.dni)) {
        throw new ErrorConflicto('El DNI ya se encuentra registrado.');
      }
      throw new Error('No se pudo guardar el postulante por un conflicto de persistencia.');
    }
    return this.mapearFilaAUsuario(res.rows[0]);
  }

  public async actualizar(usuario: Usuario): Promise<void> {
    if (!usuario.id) {
      throw new Error('No se puede actualizar un usuario sin identificador.');
    }

    const idNumerico = parseInt(usuario.id, 10);
    if (isNaN(idNumerico)) {
      throw new Error(`Identificador de usuario no valido: ${usuario.id}`);
    }

    const sedeIdNumerico = usuario.sedeId ? parseInt(usuario.sedeId, 10) : null;

    await this.pool.query(
      `UPDATE usuarios
       SET nombre = $1,
           correo = $2,
           password_hash = $3,
           password_provisional_hasta = CASE WHEN password_hash IS DISTINCT FROM $3 THEN NULL ELSE password_provisional_hasta END,
           password_cambio_obligatorio = CASE WHEN password_hash IS DISTINCT FROM $3 THEN false ELSE password_cambio_obligatorio END,
           password_cambio_motivo = CASE WHEN password_hash IS DISTINCT FROM $3 THEN NULL ELSE password_cambio_motivo END,
           activo = $4,
           sede_id = $5,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $6;`,
      [
        usuario.nombre,
        usuario.correo,
        usuario.passwordHash,
        usuario.activo,
        sedeIdNumerico,
        idNumerico,
      ]
    );
  }

  public async buscarPorId(id: string): Promise<Usuario | null> {
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      return null;
    }

    const res = await this.pool.query<FilaUsuario>(
      `SELECT id, nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador, condicion, version_sesion, password_provisional_hasta, password_cambio_obligatorio, password_cambio_motivo
       FROM usuarios
       WHERE id = $1;`,
      [idNumerico]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return this.mapearFilaAUsuario(res.rows[0]);
  }

  public async cambiarPassword(id: string, versionSesion: number, hash: string,
    evento: 'CAMBIO_VOLUNTARIO' | 'CAMBIO_OBLIGATORIO' = 'CAMBIO_VOLUNTARIO'): Promise<boolean> {
    const resultado = await this.pool.query(
      `WITH actualizado AS (
       UPDATE usuarios SET password_hash = $3, password_provisional_hasta = NULL,
         password_cambio_obligatorio = false, password_cambio_motivo = NULL,
         version_sesion = version_sesion + 1, actualizado_en = now()
       WHERE id = $1 AND activo AND version_sesion = $2
         AND (password_provisional_hasta IS NULL OR password_provisional_hasta > now())
       RETURNING id
       ), auditoria AS (
         INSERT INTO auditoria_credenciales_usuarios (usuario_id, actor_id, evento)
         SELECT id, id, $4 FROM actualizado
       ) SELECT id FROM actualizado`,
      [id, versionSesion, hash, evento],
    );
    return resultado.rowCount === 1;
  }

  public async buscarPorDni(dni: string): Promise<Usuario | null> {
    const res = await this.pool.query<FilaUsuario>(
      `SELECT id, nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador, condicion, version_sesion, password_provisional_hasta, password_cambio_obligatorio, password_cambio_motivo
       FROM usuarios
       WHERE dni = $1;`,
      [dni.trim()]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return this.mapearFilaAUsuario(res.rows[0]);
  }

  public async buscarPorCorreo(correo: string): Promise<Usuario | null> {
    const res = await this.pool.query<FilaUsuario>(
      `SELECT id, nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador, condicion, version_sesion, password_provisional_hasta, password_cambio_obligatorio, password_cambio_motivo
       FROM usuarios
       WHERE LOWER(correo) = LOWER($1);`,
      [correo.trim().toLowerCase()]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return this.mapearFilaAUsuario(res.rows[0]);
  }

  public async existeAdministradorGeneral(): Promise<boolean> {
    const res = await this.pool.query(
      `SELECT 1 FROM usuarios WHERE rol = 'ADMINISTRADOR' AND alcance_administrador = 'GENERAL' LIMIT 1;`
    );

    return (res.rowCount ?? 0) > 0;
  }

  public async listar(filtros?: FiltrosListadoUsuarios): Promise<ResultadoPaginadoUsuarios> {
    const pagina = Math.max(1, filtros?.pagina || 1);
    const limite = Math.min(100, Math.max(1, filtros?.limite || 20));
    const offset = (pagina - 1) * limite;

    let whereSql = ' WHERE 1=1';
    const params: any[] = [];
    whereSql += filtros?.soloArchivados
      ? " AND rol = 'POSTULANTE' AND NOT activo"
      : " AND (rol <> 'POSTULANTE' OR activo)";

    if (filtros?.rol) {
      params.push(filtros.rol);
      whereSql += ` AND rol = $${params.length}`;
    }

    if (filtros?.sedeId) {
      const sedeIdNumerico = parseInt(filtros.sedeId, 10);
      if (!isNaN(sedeIdNumerico)) {
        params.push(sedeIdNumerico);
        whereSql += ` AND sede_id = $${params.length}`;
      }
    }

    if (filtros?.q) {
      params.push(filtros.q);
      const termino = 'LOWER($' + params.length + '::text)';
      whereSql += ` AND (strpos(LOWER(nombre), ${termino}) > 0
        OR strpos(dni, ${termino}) > 0 OR strpos(LOWER(correo), ${termino}) > 0)`;
    }

    const countSql = `SELECT COUNT(*) AS total FROM usuarios${whereSql};`;
    const countRes = await this.pool.query<{ total: string }>(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const queryParams = [...params];
    queryParams.push(limite);
    const limitIdx = queryParams.length;
    queryParams.push(offset);
    const offsetIdx = queryParams.length;

    const selectSql = `SELECT id, nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador, condicion, version_sesion, password_provisional_hasta, password_cambio_obligatorio, password_cambio_motivo
               FROM usuarios${whereSql}
               ORDER BY id ASC
               LIMIT $${limitIdx} OFFSET $${offsetIdx};`;

    const res = await this.pool.query<FilaUsuario>(selectSql, queryParams);
    return {
      usuarios: res.rows.map((fila) => this.mapearFilaAUsuario(fila)),
      total,
      pagina,
      limite,
    };
  }
}
