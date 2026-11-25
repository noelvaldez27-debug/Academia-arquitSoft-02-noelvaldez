import { ErrorBancoPreguntas } from '../dominio/errores';
import { TemaRepository } from '../dominio/tema-repository';
import { ActorBanco } from './actor-banco';
import { requerirGeneral } from './gestionar-preguntas.use-case';

export class GestionarTemasUseCase {
  constructor(
    private readonly temas: TemaRepository,
    private readonly existeCurso: (id: string) => Promise<boolean>,
    private readonly cursosAsignados: (id: string) => Promise<string[]>,
    private readonly generarId: () => string,
  ) {}

  async listar(actor: ActorBanco, cursoId: string) {
    if (actor.permiso !== 'general' &&
        (actor.permiso !== 'docente' || !(await this.cursosAsignados(actor.id)).includes(cursoId))) {
      throw new ErrorBancoPreguntas('acceso', 'No tiene acceso a los temas de este curso.');
    }
    await this.verificarCurso(cursoId);
    return this.temas.listar(cursoId);
  }

  async crear(actor: ActorBanco, cursoId: string, nombre: unknown) {
    requerirGeneral(actor);
    await this.verificarCurso(cursoId);
    return this.temas.crear({ id: this.generarId(), cursoId, nombre: validarNombre(nombre), activo: true });
  }

  async editar(actor: ActorBanco, id: string, nombre: unknown) {
    requerirGeneral(actor);
    return this.temas.actualizar(id, { nombre: validarNombre(nombre) });
  }

  async desactivar(actor: ActorBanco, id: string) {
    requerirGeneral(actor);
    return this.temas.actualizar(id, { activo: false });
  }

  private async verificarCurso(id: string) {
    if (!await this.existeCurso(id)) throw new ErrorBancoPreguntas('no-encontrado', 'Curso no encontrado.');
  }
}

function validarNombre(nombre: unknown) {
  if (typeof nombre !== 'string' || !nombre.trim()) {
    throw new ErrorBancoPreguntas('validacion', 'El nombre del tema es obligatorio.');
  }
  return nombre.trim();
}
