import {
  UsuarioRepository,
  RolUsuario,
  ErrorValidacion,
  ErrorConflicto,
  ErrorAutenticacion,
  ErrorAccesoDenegado,
} from '../dominio';
import { ServicioHash } from './servicio-hash.port';
import { CambiarCorreoCommand } from './cambiar-correo.command';

/**
 * Caso de uso: cambiar el propio correo del administrador (HU22, RF26, CA-U09).
 * Solo los administradores (general o de sede) pueden cambiar su correo.
 * Exige la contraseña actual; si no coincide, responde mensaje genérico (AC04).
 * El nuevo correo no puede estar en uso por otro usuario.
 */
export class CambiarCorreoUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly servicioHash: ServicioHash
  ) {}

  public async ejecutar(comando: CambiarCorreoCommand): Promise<void> {
    if (!comando.usuarioId || comando.usuarioId.trim() === '') {
      throw new ErrorAutenticacion('Acceso no autorizado: identificador de usuario requerido.');
    }

    if (!comando.nuevoCorreo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(comando.nuevoCorreo.trim())) {
      throw new ErrorValidacion('El correo proporcionado no es valido.');
    }

    if (!comando.passwordActual || comando.passwordActual.trim() === '') {
      throw new ErrorValidacion('La contrasena actual es obligatoria.');
    }

    const usuario = await this.usuarioRepository.buscarPorId(comando.usuarioId);
    if (!usuario || !usuario.activo) {
      throw new ErrorAutenticacion('Credenciales invalidas.');
    }

    if (usuario.rol !== RolUsuario.Administrador) {
      throw new ErrorAccesoDenegado('Solo los administradores pueden cambiar su correo.');
    }

    const passwordValida = await this.servicioHash.comparar(
      comando.passwordActual,
      usuario.passwordHash
    );
    if (!passwordValida) {
      throw new ErrorAutenticacion('Credenciales invalidas.');
    }

    const correoNormalizado = comando.nuevoCorreo.trim().toLowerCase();
    const existente = await this.usuarioRepository.buscarPorCorreo(correoNormalizado);
    if (existente && existente.id !== usuario.id) {
      throw new ErrorConflicto('El correo ya esta en uso por otro usuario.');
    }

    usuario.cambiarCorreo(correoNormalizado);
    await this.usuarioRepository.actualizar(usuario);
  }
}
