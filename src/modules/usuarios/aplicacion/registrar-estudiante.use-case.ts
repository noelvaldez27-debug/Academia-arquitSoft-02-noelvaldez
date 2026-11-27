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
import { CondicionPostulante, esCondicionPostulante } from '../dominio/usuario';
import type { EmisionProvisional } from '../dominio/emision-provisional';

/**
 * Caso de uso: registrar estudiante con nombre, DNI, sede y carrera (RF01, RF22, HU01, CA-U01).
 * Ejecutable por administrador general (cualquier sede) o administrador de sede (solo su sede).
 * Normaliza la carrera a mayúsculas y sin espacios superfluos.
 * Reutilizable internamente tanto para registro individual como para carga masiva (tarea 21).
 */
export class RegistrarEstudianteUseCase {
  modoAutomatico?: (cicloId: string, datos: { nombre: string; dni: string; sedeId: string; carrera: string; condicion?: CondicionPostulante | null },
    actor: NonNullable<RegistrarEstudianteCommand['ejecutor']>, cargaId: string) => Promise<{
      resultado: 'creada' | 'recuperada' | 'vinculada' | 'existente'; advertencia?: string;
    }>;
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly sedeRepository: SedeRepository,
    private readonly generadorCredenciales: GeneradorCredenciales,
    private readonly emitir?: (administradorId: string, cargaId?: string) => Promise<EmisionProvisional>,
    private readonly registrarEnCiclo?: (cicloId: string, postulante: Usuario,
      actor: NonNullable<RegistrarEstudianteCommand['ejecutor']>, emision: EmisionProvisional) =>
      Promise<{ usuario: Usuario; recuperado: boolean }>,
    private readonly registrarAutomaticamenteEnCiclo?: (cicloId: string, datos: { nombre: string; dni: string; sedeId: string; carrera: string; condicion: CondicionPostulante | null },
      actor: NonNullable<RegistrarEstudianteCommand['ejecutor']>, emitir: () => Promise<EmisionProvisional>) =>
      Promise<{ usuario: Usuario; resultado: 'creada' | 'recuperada' | 'vinculada' | 'existente' }>,
  ) {}

  public async ejecutar(command: RegistrarEstudianteCommand, informarRecuperacion?: () => void,
    informarResultadoAutomatico?: (resultado: 'creada' | 'recuperada' | 'vinculada' | 'existente') => void): Promise<Usuario> {
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

    if (command.modoAutomatico && (typeof command.cicloId !== 'string' || !command.cicloId)) {
      throw new ErrorValidacion('Selecciona un ciclo académico abierto para el estudiante.');
    }
    if (command.cicloId !== undefined && (typeof command.cicloId !== 'string' ||
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(command.cicloId))) {
      throw new ErrorValidacion('Identificador de ciclo inválido.');
    }
    const condicion = command.condicion;
    if (condicion != null && !esCondicionPostulante(condicion)) {
      throw new ErrorValidacion('La condición del postulante debe ser MATRICULADO o LIBRE.');
    }

    if (command.modoAutomatico) {
      if (!command.cicloId || !this.registrarAutomaticamenteEnCiclo || !this.emitir) throw new ErrorValidacion('No se pudo preparar el registro por ciclo.');
      const resultado = await this.registrarAutomaticamenteEnCiclo(command.cicloId.toLowerCase(), {
        nombre: command.nombre.trim(), dni: command.dni.trim(), sedeId: sede.id ?? sede.nombre,
        carrera: command.carrera, condicion: esCondicionPostulante(command.condicion) ? command.condicion : null,
      }, command.ejecutor, () => this.emitir!(command.ejecutor!.id, command.cargaId));
      informarResultadoAutomatico?.(resultado.resultado);
      if (resultado.resultado === 'recuperada') informarRecuperacion?.();
      return resultado.usuario;
    }
    const usuarioExistente = await this.usuarioRepository.buscarPorDni(command.dni.trim());
    if (usuarioExistente) throw new ErrorConflicto('El DNI ya se encuentra registrado.');
    const emision = await this.emitir?.(command.ejecutor.id, command.cargaId);
    const credenciales = emision
      ? { correo: GeneradorCredenciales.generarCorreoDni(command.dni), passwordHash: emision.passwordHash }
      : await this.generadorCredenciales.generarParaDni(command.dni.trim());

    const nuevoPostulante = Usuario.crearPostulante({
      nombre: command.nombre.trim(),
      dni: command.dni.trim(),
      correo: credenciales.correo,
      passwordHash: credenciales.passwordHash,
      sedeId: sede.id ?? sede.nombre,
      carrera: command.carrera,
      condicion: esCondicionPostulante(condicion) ? condicion : null,
    });

    if (command.cicloId) {
      if (!this.registrarEnCiclo || !emision) throw new Error('Registro por ciclo no disponible.');
      const resultado = await this.registrarEnCiclo(command.cicloId.toLowerCase(), nuevoPostulante, command.ejecutor, emision);
      if (resultado.recuperado) informarRecuperacion?.();
      return resultado.usuario;
    }
    return emision ? this.usuarioRepository.guardar(nuevoPostulante, emision) : this.usuarioRepository.guardar(nuevoPostulante);
  }
}
