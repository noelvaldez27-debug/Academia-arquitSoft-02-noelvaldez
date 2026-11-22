import {
  Usuario,
  UsuarioRepository,
  SedeRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
  ErrorValidacion,
  ErrorConflicto,
  LONGITUD_MINIMA_PASSWORD,
} from '../dominio';
import { ServicioHash } from './servicio-hash.port';
import { RegistrarAdministradorSedeCommand } from './registrar-administrador-sede.command';

/**
 * Caso de uso: Crear cuentas de administrador de sede (RF25, HU19, CA-U12).
 * - Solo el administrador general puede crear cuentas de administrador de sede.
 * - Nombre, correo, contraseña inicial y sede definidos por quien crea la cuenta.
 * - Excepción a la regla del DNI (RC09).
 * - No se puede crear otro administrador general.
 * - Nunca expone contraseñas ni hashes (AC04).
 */
export class RegistrarAdministradorSedeUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly sedeRepository: SedeRepository,
    private readonly servicioHash: ServicioHash
  ) {}

  public async ejecutar(command: RegistrarAdministradorSedeCommand): Promise<Usuario> {
    if (!command.ejecutor) {
      throw new ErrorAccesoDenegado('Acceso no autorizado: debe iniciar sesion.');
    }

    if (command.ejecutor.rol !== RolUsuario.Administrador) {
      throw new ErrorAccesoDenegado(
        'Acceso denegado: solo el administrador general puede crear cuentas de administrador.'
      );
    }

    if (command.ejecutor.alcanceAdministrador !== AlcanceAdministrador.General) {
      throw new ErrorAccesoDenegado(
        'Acceso denegado: solo el administrador general puede crear administradores de sede.'
      );
    }

    if (!command.nombre || command.nombre.trim() === '') {
      throw new ErrorValidacion('El nombre del administrador de sede es obligatorio.');
    }

    if (!command.correo || command.correo.trim() === '') {
      throw new ErrorValidacion('El correo es obligatorio.');
    }

    const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexCorreo.test(command.correo.trim())) {
      throw new ErrorValidacion('El formato del correo electronico no es valido.');
    }

    if (!command.passwordInicial || command.passwordInicial.length < LONGITUD_MINIMA_PASSWORD) {
      throw new ErrorValidacion(
        `La contrasena inicial debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`
      );
    }

    if (!command.sedeId || command.sedeId.trim() === '') {
      throw new ErrorValidacion('La sede es obligatoria para un administrador de sede.');
    }

    // Comprobar conflicto de correo
    const correoNormalizado = command.correo.trim().toLowerCase();
    const usuarioExistente = await this.usuarioRepository.buscarPorCorreo(correoNormalizado);
    if (usuarioExistente) {
      throw new ErrorConflicto('El correo ya esta en uso por otro usuario.');
    }

    // Comprobar existencia de la sede
    const sedeBuscada = command.sedeId.trim();
    let sede = await this.sedeRepository.buscarPorId(sedeBuscada);
    if (!sede) {
      sede = await this.sedeRepository.buscarPorNombre(sedeBuscada);
    }

    if (!sede || !sede.id) {
      throw new ErrorValidacion('La sede especificada no existe.');
    }

    const passwordHash = await this.servicioHash.generarHash(command.passwordInicial);

    const nuevoAdminSede = Usuario.crearAdministradorSede({
      nombre: command.nombre.trim(),
      correo: correoNormalizado,
      passwordHash,
      sedeId: sede.id,
      activo: true,
    });

    return await this.usuarioRepository.guardar(nuevoAdminSede);
  }
}
