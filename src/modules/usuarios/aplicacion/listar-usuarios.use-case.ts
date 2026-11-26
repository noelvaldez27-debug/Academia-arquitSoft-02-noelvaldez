import {
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
} from '../dominio';

export interface EjecutorListado {
  id: string;
  rol: RolUsuario;
  sedeId?: string | null;
  alcanceAdministrador?: AlcanceAdministrador | null;
}

export interface ListarUsuariosQuery {
  rol?: RolUsuario;
  sedeId?: string;
  pagina?: number;
  limite?: number;
  soloArchivados?: boolean;
  q?: string;
  ejecutor?: EjecutorListado;
}

export interface UsuarioResumenDTO {
  id: string;
  nombre: string;
  dni: string | null;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  sedeId: string | null;
  carrera: string | null;
}

export interface ListarUsuariosResultado {
  usuarios: UsuarioResumenDTO[];
  total: number;
  pagina: number;
  limite: number;
}

/**
 * Caso de uso: Listar usuarios con paginación y filtros por rol y por sede (RF23, CA-U10).
 * - El administrador general puede consultar todos los usuarios de cualquier rol o sede.
 * - El administrador de sede solo puede consultar postulantes pertenecientes a su propia sede.
 * - Postulantes y docentes tienen acceso denegado.
 * - Nunca expone contraseñas ni hashes (AC04).
 */
export class ListarUsuariosUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  public async ejecutar(query: ListarUsuariosQuery): Promise<ListarUsuariosResultado> {
    if (!query.ejecutor) {
      throw new ErrorAccesoDenegado('Acceso denegado: debe autenticarse para listar usuarios.');
    }

    if (query.ejecutor.rol !== RolUsuario.Administrador) {
      throw new ErrorAccesoDenegado('Acceso denegado: solo los administradores pueden consultar el listado de usuarios.');
    }

    let rolFiltro = query.rol;
    let sedeIdFiltro = query.sedeId;

    if (query.ejecutor.alcanceAdministrador === AlcanceAdministrador.Sede) {
      if (rolFiltro && rolFiltro !== RolUsuario.Postulante) {
        throw new ErrorAccesoDenegado(
          'Acceso denegado: el administrador de sede solo puede listar postulantes.'
        );
      }
      if (sedeIdFiltro && String(sedeIdFiltro) !== String(query.ejecutor.sedeId)) {
        throw new ErrorAccesoDenegado(
          'Acceso denegado: el administrador de sede no puede consultar usuarios de otra sede.'
        );
      }

      rolFiltro = RolUsuario.Postulante;
      sedeIdFiltro = query.ejecutor.sedeId ?? undefined;
    }

    const pagina = Math.max(1, query.pagina || 1);
    const limite = Math.min(100, Math.max(1, query.limite || 20));

    const resultado = await this.usuarioRepository.listar({
      rol: rolFiltro,
      sedeId: sedeIdFiltro,
      pagina,
      limite,
      ...(query.q && { q: query.q }),
      ...(query.soloArchivados && { soloArchivados: true }),
    });

    const usuarios: UsuarioResumenDTO[] = resultado.usuarios.map((u) => ({
      id: u.id ?? '',
      nombre: u.nombre,
      dni: u.dni ?? null,
      correo: u.correo,
      rol: u.rol,
      activo: u.activo,
      sedeId: u.sedeId ?? null,
      carrera: u.carrera ?? null,
    }));

    return {
      usuarios,
      total: resultado.total,
      pagina: resultado.pagina,
      limite: resultado.limite,
    };
  }
}
