import { ErrorBancoPreguntas } from '../dominio/errores';
import { ContenidoPregunta, Pregunta, validarContenidoPregunta } from '../dominio/pregunta';
import { PreguntaRepository } from '../dominio/pregunta-repository';
import { ActorBanco } from './actor-banco';

export function requerirGeneral(actor: ActorBanco): void {
  if (actor.permiso !== 'general') {
    throw new ErrorBancoPreguntas('acceso', 'Se requiere el administrador general.');
  }
}

export class GestionarPreguntasUseCase {
  constructor(private readonly preguntas: PreguntaRepository, private readonly generarId: () => string) {}

  async guardarCurso(actor: ActorBanco, nombre: string) {
    requerirGeneral(actor);
    if (typeof nombre !== 'string' || !nombre.trim()) {
      throw new ErrorBancoPreguntas('validacion', 'El nombre del curso es obligatorio.');
    }
    const curso = { id: this.generarId(), nombre: nombre.trim() };
    await this.preguntas.guardarCurso(curso);
    return curso;
  }

  async listar(actor: ActorBanco, cursoId: string) {
    requerirGeneral(actor);
    return this.preguntas.listar(cursoId);
  }

  async crear(actor: ActorBanco, cursoId: string, contenido: ContenidoPregunta): Promise<Pregunta> {
    requerirGeneral(actor);
    if (!await this.preguntas.curso(cursoId)) {
      throw new ErrorBancoPreguntas('no-encontrado', 'Curso no encontrado.');
    }
    const pregunta = {
      id: this.generarId(), cursoId, propuestaId: null, habilitada: true, ...validarContenidoPregunta(contenido),
    };
    await this.preguntas.guardar(pregunta);
    return pregunta;
  }

  async editar(actor: ActorBanco, id: string, cambio: ContenidoPregunta & { habilitada?: boolean }): Promise<Pregunta> {
    requerirGeneral(actor);
    const actual = await this.preguntas.buscar(id);
    if (!actual) throw new ErrorBancoPreguntas('no-encontrado', 'Pregunta no encontrada.');
    if (actual.propuestaId) {
      throw new ErrorBancoPreguntas('conflicto', 'Edita la propuesta de origen para solicitar una nueva validación docente.');
    }
    if (cambio.habilitada !== undefined && typeof cambio.habilitada !== 'boolean') {
      throw new ErrorBancoPreguntas('validacion', 'El valor de habilitada debe ser booleano.');
    }
    const editada = { ...actual, ...validarContenidoPregunta(cambio), habilitada: cambio.habilitada ?? actual.habilitada };
    await this.preguntas.guardar(editada);
    return editada;
  }
}
