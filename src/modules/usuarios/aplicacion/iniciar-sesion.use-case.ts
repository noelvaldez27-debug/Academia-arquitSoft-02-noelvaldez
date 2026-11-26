import { UsuarioRepository, ErrorAutenticacion } from '../dominio';
import { ServicioHash } from './servicio-hash.port';
import { ServicioToken } from './servicio-token.port';
import { IniciarSesionCommand, ResultadoInicioSesion } from './iniciar-sesion.command';

/**
 * Caso de uso: iniciar sesión y emitir JWT con identificador, rol y sede (ADR-007, CA-U05, HU20, RF20).
 * Maneja duración configurable del token.
 * Si las credenciales son incorrectas o el usuario está inactivo, responde con el mismo error genérico.
 * Nunca expone contraseñas ni hashes.
 */
export class IniciarSesionUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly servicioHash: ServicioHash,
    private readonly servicioToken: ServicioToken
  ) {}

  public async ejecutar(command: IniciarSesionCommand): Promise<ResultadoInicioSesion> {
    if (!command.correo || !command.password || command.correo.trim() === '' || command.password.trim() === '') {
      throw new ErrorAutenticacion('Credenciales invalidas.');
    }

    const usuario = await this.usuarioRepository.buscarPorCorreo(command.correo.trim().toLowerCase());
    if (!usuario) {
      throw new ErrorAutenticacion('Credenciales invalidas.');
    }

    if (!usuario.activo) {
      throw new ErrorAutenticacion('Credenciales invalidas.');
    }

    const passwordValido = await this.servicioHash.comparar(command.password, usuario.passwordHash);
    if (!passwordValido) {
      throw new ErrorAutenticacion('Credenciales invalidas.');
    }

    const token = await this.servicioToken.generarToken({
      id: usuario.id ?? '',
      rol: usuario.rol,
      sedeId: usuario.sedeId ?? null,
      ...(usuario.versionSesion > 0 && { versionSesion: usuario.versionSesion }),
    });

    return {
      token,
      usuario: {
        id: usuario.id ?? '',
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        sedeId: usuario.sedeId ?? null,
      },
    };
  }
}
