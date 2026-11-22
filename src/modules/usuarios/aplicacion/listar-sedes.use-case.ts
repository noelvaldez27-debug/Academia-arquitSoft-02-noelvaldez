import {
  Sede,
  SedeRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
} from '../dominio';

export interface ListarSedesQuery {
  ejecutor?: {
    id: string;
    rol: RolUsuario;
    sedeId?: string | null;
    alcanceAdministrador?: AlcanceAdministrador | null;
  };
}

/**
 * Caso de uso: Listar sedes existentes (RF22, AC05, CA-U14).
 * - Cualquier administrador autenticado (general o de sede) puede listar las sedes existentes.
 * - Postulantes y docentes tienen acceso denegado.
 */
export class ListarSedesUseCase {
  constructor(private readonly sedeRepository: SedeRepository) {}

  public async ejecutar(query: ListarSedesQuery): Promise<Sede[]> {
    if (!query.ejecutor) {
      throw new ErrorAccesoDenegado('Acceso no autorizado: debe iniciar sesion.');
    }

    if (query.ejecutor.rol !== RolUsuario.Administrador) {
      throw new ErrorAccesoDenegado('Acceso denegado: solo los administradores pueden consultar las sedes.');
    }

    return await this.sedeRepository.listarTodas();
  }
}
