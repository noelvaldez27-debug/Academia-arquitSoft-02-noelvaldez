import { ErrorBancoPreguntas } from '../dominio/errores';
import { ActorBanco } from './actor-banco';
import { requerirGeneral } from './gestionar-preguntas.use-case';

export class GestionarAsignacionesUseCase {
  constructor(
    private readonly esDocente: (id: string) => Promise<boolean>,
    private readonly existeCurso: (id: string) => Promise<unknown>,
    private readonly guardar: (docente: string, curso: string, asignado: boolean) => Promise<void>,
  ) {}

  async ejecutar(actor: ActorBanco, docente: string, curso: string, asignado: boolean) {
    requerirGeneral(actor);
    if (!await this.esDocente(docente)) throw new ErrorBancoPreguntas('no-encontrado', 'Docente no encontrado.');
    if (!await this.existeCurso(curso)) throw new ErrorBancoPreguntas('no-encontrado', 'Curso no encontrado.');
    await this.guardar(docente, curso, asignado);
    return { docenteId: docente, cursoId: curso, asignado };
  }
}
