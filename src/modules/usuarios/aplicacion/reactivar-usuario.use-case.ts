import {
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
  ErrorValidacion,
  ErrorNoEncontrado,
} from '../dominio';

export interface ReactivarUsuarioCommand {
  usuarioId: string;
  ejecutor?: {
    id: string;
    rol: RolUsuario;
    sedeId?: string | null;
    alcanceAdministrador?: AlcanceAdministrador | null;
  };
}

/**
 * Caso de uso: Reactivar usuario inactivo (RF24, RC16, CA-U11).
 * - El administrador general puede reactivar cualquier usuario inactivo.
 * - El administrador de sede solo puede reactivar postulantes de su propia sede.
 * - Postulantes y docentes tienen acceso denegado.
 */
export class ReactivarUsuarioUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  public async ejecutar(command: ReactivarUsuarioCommand): Promise<void> {
    if (!command.ejecutor) {
      throw new ErrorAccesoDenegado('Acceso no autorizado: debe iniciar sesion.');
    }

    if (command.ejecutor.rol !== RolUsuario.Administrador) {
      throw new ErrorAccesoDenegado('Acceso denegado: solo los administradores pueden reactivar usuarios.');
    }

    if (!command.usuarioId || command.usuarioId.trim() === '') {
      throw new ErrorValidacion('El identificador del usuario es obligatorio.');
    }

    const usuarioId = command.usuarioId.trim();

    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new ErrorNoEncontrado('Usuario no encontrado.');
    }

    // El administrador de sede solo puede reactivar postulantes de su propia sede (CA-U11)
    if (command.ejecutor.alcanceAdministrador === AlcanceAdministrador.Sede) {
      if (usuario.rol !== RolUsuario.Postulante) {
        throw new ErrorAccesoDenegado(
          'Acceso denegado: el administrador de sede solo puede reactivar postulantes.'
        );
      }

      if (String(usuario.sedeId) !== String(command.ejecutor.sedeId)) {
        throw new ErrorAccesoDenegado(
          'Acceso denegado: el administrador de sede no puede reactivar usuarios de otra sede.'
        );
      }
    }

    usuario.reactivar();
    await this.usuarioRepository.actualizar(usuario);
  }
}
