import {
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
  ErrorValidacion,
  ErrorNoEncontrado,
} from '../dominio';

export interface DesactivarUsuarioCommand {
  usuarioId: string;
  ejecutor?: {
    id: string;
    rol: RolUsuario;
    sedeId?: string | null;
    alcanceAdministrador?: AlcanceAdministrador | null;
  };
}

/**
 * Caso de uso: Desactivar usuario sin borrarlo (RF24, RC16, CA-U11).
 * - El administrador general puede desactivar postulantes, docentes o administradores de sede.
 * - Nadie puede desactivarse a sí mismo.
 * - Nadie puede desactivar al administrador general.
 * - El administrador de sede solo puede desactivar postulantes de su propia sede.
 * - Postulantes y docentes tienen acceso denegado.
 */
export class DesactivarUsuarioUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepository,
    private readonly archivarPostulantes?: (actor: NonNullable<DesactivarUsuarioCommand['ejecutor']>,
      ids: string[]) => Promise<unknown>) {}

  public async ejecutar(command: DesactivarUsuarioCommand): Promise<void> {
    if (!command.ejecutor) {
      throw new ErrorAccesoDenegado('Acceso no autorizado: debe iniciar sesion.');
    }

    if (command.ejecutor.rol !== RolUsuario.Administrador) {
      throw new ErrorAccesoDenegado('Acceso denegado: solo los administradores pueden desactivar usuarios.');
    }

    if (!command.usuarioId || command.usuarioId.trim() === '') {
      throw new ErrorValidacion('El identificador del usuario es obligatorio.');
    }

    const usuarioId = command.usuarioId.trim();

    // Nadie puede desactivarse a sí mismo (CA-U11)
    if (String(command.ejecutor.id) === String(usuarioId)) {
      throw new ErrorValidacion('No se permite desactivarse a si mismo.');
    }

    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new ErrorNoEncontrado('Usuario no encontrado.');
    }

    // Nadie puede desactivar al administrador general (CA-U11)
    if (
      usuario.rol === RolUsuario.Administrador &&
      usuario.alcanceAdministrador === AlcanceAdministrador.General
    ) {
      throw new ErrorValidacion('No se permite desactivar al administrador general.');
    }

    // El administrador de sede solo puede desactivar postulantes de su propia sede (CA-U11)
    if (command.ejecutor.alcanceAdministrador === AlcanceAdministrador.Sede) {
      if (usuario.rol !== RolUsuario.Postulante) {
        throw new ErrorAccesoDenegado(
          'Acceso denegado: el administrador de sede solo puede desactivar postulantes.'
        );
      }

      if (String(usuario.sedeId) !== String(command.ejecutor.sedeId)) {
        throw new ErrorAccesoDenegado(
          'Acceso denegado: el administrador de sede no puede desactivar usuarios de otra sede.'
        );
      }
    }

    if (usuario.rol === RolUsuario.Postulante && this.archivarPostulantes) {
      await this.archivarPostulantes(command.ejecutor, [usuarioId]);
      return;
    }
    usuario.desactivar();
    await this.usuarioRepository.actualizar(usuario);
  }
}
