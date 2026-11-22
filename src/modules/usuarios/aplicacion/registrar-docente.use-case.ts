import {
  Usuario,
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorValidacion,
  ErrorConflicto,
  ErrorAccesoDenegado,
  ErrorNoAutenticado,
} from '../dominio';
import { GeneradorCredenciales } from './generar-credenciales';
import { RegistrarDocenteCommand } from './registrar-docente.command';

/**
 * Caso de uso: registrar docente con nombre y DNI (RF19, HU14, CA-U03).
 * Lo ejecuta exclusivamente el administrador general.
 * Reutiliza la generación automática de credenciales (dni@sofia.edu y hash del DNI).
 */
export class RegistrarDocenteUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly generadorCredenciales: GeneradorCredenciales
  ) {}

  public async ejecutar(command: RegistrarDocenteCommand): Promise<Usuario> {
    if (!command.ejecutor) {
      throw new ErrorNoAutenticado('Acceso no autorizado.');
    }

    if (
      command.ejecutor.rol !== RolUsuario.Administrador ||
      command.ejecutor.alcanceAdministrador !== AlcanceAdministrador.General
    ) {
      throw new ErrorAccesoDenegado('Acceso denegado: solo el administrador general puede registrar docentes.');
    }

    if (!command.nombre || command.nombre.trim() === '') {
      throw new ErrorValidacion('El nombre del docente es obligatorio.');
    }

    if (!command.dni || !/^\d{8}$/.test(command.dni.trim())) {
      throw new ErrorValidacion('El DNI debe tener exactamente 8 digitos numericos.');
    }

    const usuarioExistente = await this.usuarioRepository.buscarPorDni(command.dni.trim());
    if (usuarioExistente) {
      throw new ErrorConflicto('El DNI ya se encuentra registrado.');
    }

    const credenciales = await this.generadorCredenciales.generarParaDni(command.dni.trim());

    const nuevoDocente = Usuario.crearDocente({
      nombre: command.nombre.trim(),
      dni: command.dni.trim(),
      correo: credenciales.correo,
      passwordHash: credenciales.passwordHash,
    });

    return await this.usuarioRepository.guardar(nuevoDocente);
  }
}
