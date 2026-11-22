import {
  Usuario,
  UsuarioRepository,
  SedeRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorValidacion,
  ErrorConflicto,
  ErrorAccesoDenegado,
  ErrorNoAutenticado,
} from '../dominio';
import { GeneradorCredenciales } from './generar-credenciales';
import { RegistrarEstudianteCommand } from './registrar-estudiante.command';

/**
 * Caso de uso: registrar estudiante con nombre, DNI, sede y carrera (RF01, RF22, HU01, CA-U01).
 * Ejecutable por administrador general (cualquier sede) o administrador de sede (solo su sede).
 * Normaliza la carrera a mayúsculas y sin espacios superfluos.
 * Reutilizable internamente tanto para registro individual como para carga masiva (tarea 21).
 */
export class RegistrarEstudianteUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly sedeRepository: SedeRepository,
    private readonly generadorCredenciales: GeneradorCredenciales
  ) {}

  public async ejecutar(command: RegistrarEstudianteCommand): Promise<Usuario> {
    if (!command.ejecutor) {
      throw new ErrorNoAutenticado('Acceso no autorizado.');
    }

    if (command.ejecutor.rol !== RolUsuario.Administrador) {
      throw new ErrorAccesoDenegado('Acceso denegado: solo administradores pueden registrar estudiantes.');
    }

    if (!command.nombre || command.nombre.trim() === '') {
      throw new ErrorValidacion('El nombre del estudiante es obligatorio.');
    }

    if (!command.dni || !/^\d{8}$/.test(command.dni.trim())) {
      throw new ErrorValidacion('El DNI debe tener exactamente 8 digitos numericos.');
    }

    if (!command.sedeId || command.sedeId.trim() === '') {
      throw new ErrorValidacion('La sede es obligatoria para registrar un estudiante.');
    }

    if (!command.carrera || command.carrera.trim() === '') {
      throw new ErrorValidacion('La carrera es obligatoria para registrar un estudiante.');
    }

    const sedeBuscada = command.sedeId.trim();
    let sede = await this.sedeRepository.buscarPorId(sedeBuscada);
    if (!sede) {
      sede = await this.sedeRepository.buscarPorNombre(sedeBuscada);
    }

    if (!sede) {
      throw new ErrorValidacion('La sede especificada no existe.');
    }

    if (command.ejecutor.alcanceAdministrador === AlcanceAdministrador.Sede) {
      if (
        command.ejecutor.sedeId !== sede.id &&
        command.ejecutor.sedeId?.toLowerCase() !== sede.nombre.toLowerCase()
      ) {
        throw new ErrorAccesoDenegado('Acceso denegado: el administrador de sede solo puede registrar estudiantes en su sede.');
      }
    }

    const usuarioExistente = await this.usuarioRepository.buscarPorDni(command.dni.trim());
    if (usuarioExistente) {
      throw new ErrorConflicto('El DNI ya se encuentra registrado.');
    }

    const credenciales = await this.generadorCredenciales.generarParaDni(command.dni.trim());

    const nuevoPostulante = Usuario.crearPostulante({
      nombre: command.nombre.trim(),
      dni: command.dni.trim(),
      correo: credenciales.correo,
      passwordHash: credenciales.passwordHash,
      sedeId: sede.id ?? sede.nombre,
      carrera: command.carrera,
    });

    return await this.usuarioRepository.guardar(nuevoPostulante);
  }
}
