import { Pool } from 'pg';
import {
  Usuario,
  UsuarioRepository,
  FiltrosListadoUsuarios,
  ResultadoPaginadoUsuarios,
  RolUsuario,
  AlcanceAdministrador,
} from '../dominio';

interface FilaUsuario {
  id: number;
  nombre: string;
  dni: string | null;
  correo: string;
  password_hash: string;
  rol: string;
  activo: boolean;
  sede_id: number | null;
  carrera: string | null;
  alcance_administrador: string | null;
}

export class PostgresUsuarioRepository implements UsuarioRepository {
  constructor(private readonly pool: Pool) {}

  private mapearFilaAUsuario(fila: FilaUsuario): Usuario {
    return new Usuario({
      id: String(fila.id),
      nombre: fila.nombre,
      dni: fila.dni,
      correo: fila.correo,
      passwordHash: fila.password_hash,
      rol: fila.rol as RolUsuario,
      activo: fila.activo,
      sedeId: fila.sede_id !== null && fila.sede_id !== undefined ? String(fila.sede_id) : null,
      carrera: fila.carrera,
      alcanceAdministrador: fila.alcance_administrador
        ? (fila.alcance_administrador as AlcanceAdministrador)
        : null,
    });
  }

  public async guardar(usuario: Usuario): Promise<Usuario> {
    const sedeIdNumerico = usuario.sedeId ? parseInt(usuario.sedeId, 10) : null;

    const res = await this.pool.query<FilaUsuario>(
      `INSERT INTO usuarios (nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador;`,
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
      ]
    );

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
      `SELECT id, nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador
       FROM usuarios
       WHERE id = $1;`,
      [idNumerico]
    );

    if (res.rows.length === 0) {
      return null;
    }

    return this.mapearFilaAUsuario(res.rows[0]);
  }

  public async buscarPorDni(dni: string): Promise<Usuario | null> {
    const res = await this.pool.query<FilaUsuario>(
      `SELECT id, nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador
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
      `SELECT id, nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador
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

    const countSql = `SELECT COUNT(*) AS total FROM usuarios${whereSql};`;
    const countRes = await this.pool.query<{ total: string }>(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const queryParams = [...params];
    queryParams.push(limite);
    const limitIdx = queryParams.length;
    queryParams.push(offset);
    const offsetIdx = queryParams.length;

    const selectSql = `SELECT id, nombre, dni, correo, password_hash, rol, activo, sede_id, carrera, alcance_administrador
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
