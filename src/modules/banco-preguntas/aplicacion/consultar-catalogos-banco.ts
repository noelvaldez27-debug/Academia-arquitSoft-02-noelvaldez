import type { ActorBanco } from './actor-banco';
import { requerirGeneral } from './gestionar-preguntas.use-case';
import { ErrorBancoPreguntas } from '../dominio/errores';

export interface OpcionesPagina { pagina: number; limite: number; q: string }
export interface ResumenSeparata { id: string; cursoId: string; estado: string; mime: string }

export class ConsultarCatalogosBanco {
  constructor(private readonly consultas: {
    separatas(docenteId: string | null, cursoId: string, estado: string, opciones: OpcionesPagina): Promise<ResumenSeparata[]>;
    cursos(opciones: OpcionesPagina): Promise<{ id: string; nombre: string }[]>;
    simulacros(opciones: OpcionesPagina): Promise<{ id: string; duracionMinutos: number; preguntas: string[] }[]>;
    docentes(curso: string, opciones: OpcionesPagina): Promise<{ id: string }[]>;
  }) {}

  cursos(actor: ActorBanco, opciones: OpcionesPagina) {
    if (actor.permiso === 'ninguno') throw new ErrorBancoPreguntas('acceso', 'Se requiere un administrador general o docente.');
    return this.pagina(this.consultas.cursos(opciones), opciones);
  }

  simulacros(actor: ActorBanco, opciones: OpcionesPagina) {
    requerirGeneral(actor);
    return this.pagina(this.consultas.simulacros(opciones), opciones);
  }

  docentes(actor: ActorBanco, curso: string, opciones: OpcionesPagina) {
    requerirGeneral(actor);
    return this.pagina(this.consultas.docentes(curso, opciones), opciones);
  }

  separatas(actor: ActorBanco, cursoId: string, estado: string, opciones: OpcionesPagina) {
    if (actor.permiso === 'ninguno') throw new ErrorBancoPreguntas('acceso', 'No puedes consultar separatas.');
    return this.pagina(this.consultas.separatas(actor.permiso === 'docente' ? actor.id : null, cursoId, estado, opciones), opciones);
  }

  private async pagina<T>(consulta: Promise<T[]>, { pagina, limite }: OpcionesPagina) {
    const filas = await consulta;
    return { datos: filas.slice(0, limite), pagina, hayMas: filas.length > limite };
  }
}
