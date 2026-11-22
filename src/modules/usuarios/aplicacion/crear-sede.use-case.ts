import {
  Sede,
  SedeRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
  ErrorValidacion,
  ErrorConflicto,
} from '../dominio';

export interface CrearSedeCommand {
  nombre: string;
  ejecutor?: {
    id: string;
    rol: RolUsuario;
    sedeId?: string | null;
    alcanceAdministrador?: AlcanceAdministrador | null;
  };
}

/**
 * Caso de uso: Crear una sede nueva (RF22, AC05, CA-U14).
 * - Solo el administrador general puede crear sedes nuevas sin cambiar código.
 * - Rechaza si el nombre de sede ya existe (conflicto).
 * - Postulantes, docentes y administradores de sede tienen acceso denegado.
 */
export class CrearSedeUseCase {
  constructor(private readonly sedeRepository: SedeRepository) {}

  public async ejecutar(command: CrearSedeCommand): Promise<Sede> {
    if (!command.ejecutor) {
      throw new ErrorAccesoDenegado('Acceso no autorizado: debe iniciar sesion.');
    }

    if (command.ejecutor.rol !== RolUsuario.Administrador) {
      throw new ErrorAccesoDenegado('Acceso denegado: solo los administradores pueden crear sedes.');
    }

    if (command.ejecutor.alcanceAdministrador !== AlcanceAdministrador.General) {
      throw new ErrorAccesoDenegado('Acceso denegado: solo el administrador general puede crear sedes.');
    }

    if (!command.nombre || command.nombre.trim() === '') {
      throw new ErrorValidacion('El nombre de la sede es obligatorio.');
    }

    const nombreNormalizado = command.nombre.trim();

    const sedeExistente = await this.sedeRepository.buscarPorNombre(nombreNormalizado);
    if (sedeExistente) {
      throw new ErrorConflicto('La sede especificada ya existe.');
    }

    const nuevaSede = new Sede({ nombre: nombreNormalizado });
    return await this.sedeRepository.guardar(nuevaSede);
  }
}
