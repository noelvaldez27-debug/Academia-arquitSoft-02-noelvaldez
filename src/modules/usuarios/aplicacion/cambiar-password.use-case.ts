import {
  UsuarioRepository,
  LONGITUD_MINIMA_PASSWORD,
  ErrorValidacion,
  ErrorAutenticacion,
} from '../dominio';
import { ServicioHash } from './servicio-hash.port';
import { CambiarPasswordCommand } from './cambiar-password.command';

/**
 * Caso de uso: cambiar la propia contraseña (HU21, RF26, CA-U08).
 * Permite a cualquier usuario autenticado actualizar su contraseña proporcionando su contraseña actual.
 * Exige una longitud mínima de 8 caracteres.
 * Si la contraseña actual no coincide, responde con un mensaje genérico de credenciales inválidas (AC04).
 */
export class CambiarPasswordUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly servicioHash: ServicioHash
  ) {}

  public async ejecutar(comando: CambiarPasswordCommand): Promise<void> {
    if (!comando.usuarioId || comando.usuarioId.trim() === '') {
      throw new ErrorAutenticacion('Acceso no autorizado: identificador de usuario requerido.');
    }

    if (!comando.passwordActual || comando.passwordActual.trim() === '') {
      throw new ErrorValidacion('La contrasena actual es obligatoria.');
    }

    if (!comando.passwordNueva || comando.passwordNueva.length < LONGITUD_MINIMA_PASSWORD) {
      throw new ErrorValidacion(
        `La nueva contrasena debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`
      );
    }

    const usuario = await this.usuarioRepository.buscarPorId(comando.usuarioId);
    if (!usuario || !usuario.activo) {
      throw new ErrorAutenticacion('Credenciales invalidas.');
    }

    const passwordValida = await this.servicioHash.comparar(
      comando.passwordActual,
      usuario.passwordHash
    );

    if (!passwordValida) {
      throw new ErrorAutenticacion('Credenciales invalidas.');
    }

    const nuevoHash = await this.servicioHash.generarHash(comando.passwordNueva);
    usuario.cambiarPasswordHash(nuevoHash);

    await this.usuarioRepository.actualizar(usuario);
  }
}
