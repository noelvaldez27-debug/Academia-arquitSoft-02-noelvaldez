import { ErrorBancoPreguntas } from '../dominio/errores';
import { ClaveAlternativa, ConfiguracionSimulacro } from '../dominio/pregunta';
import { PreguntaRepository } from '../dominio/pregunta-repository';
import { ActorBanco } from './actor-banco';
import { requerirGeneral } from './gestionar-preguntas.use-case';

export interface SimulacroParaRendicion {
  id: string;
  duracionMinutos: number;
  preguntas: { id: string; cursoId: string; enunciado: string; alternativas: Record<ClaveAlternativa, string> }[];
}

export interface ConsultaSimulacros {
  consultar(id: string): Promise<SimulacroParaRendicion>;
}

export interface ConsultaClavesSimulacro {
  clave(id: string): Promise<{ preguntaId: string; correcta: ClaveAlternativa }[]>;
}

export class GestionarSimulacrosUseCase implements ConsultaSimulacros, ConsultaClavesSimulacro {
  constructor(private readonly banco: PreguntaRepository, private readonly generarId: () => string) {}

  async guardar(actor: ActorBanco, entrada: Omit<ConfiguracionSimulacro, 'id'>, id?: string) {
    requerirGeneral(actor);
    const duracionMinutos = entrada?.duracionMinutos;
    const preguntas = entrada?.preguntas;
    if (!Number.isSafeInteger(duracionMinutos) || duracionMinutos <= 0 || duracionMinutos > 2147483647 ||
        !Array.isArray(preguntas) || !preguntas.length ||
        preguntas.some(pregunta => typeof pregunta !== 'string' || !pregunta.trim()) ||
        new Set(preguntas).size !== preguntas.length) {
      throw new ErrorBancoPreguntas('validacion', 'Indica una duración positiva y preguntas distintas en el orden deseado.');
    }
    if (id && !await this.banco.buscarSimulacro(id)) {
      throw new ErrorBancoPreguntas('no-encontrado', 'Simulacro no encontrado.');
    }
    const configuracion = { id: id ?? this.generarId(), duracionMinutos, preguntas: [...preguntas] };
    await this.preguntasDisponibles(configuracion);
    await this.banco.guardarSimulacro(configuracion);
    return configuracion;
  }

  async consultar(id: string): Promise<SimulacroParaRendicion> {
    const configuracion = await this.obtener(id);
    const preguntas = await this.preguntasDisponibles(configuracion);
    return {
      id, duracionMinutos: configuracion.duracionMinutos,
      preguntas: preguntas.map(({ id: preguntaId, cursoId, enunciado, alternativas }) => ({
        id: preguntaId, cursoId, enunciado, alternativas,
      })),
    };
  }

  async clave(id: string) {
    const preguntas = await this.preguntasDisponibles(await this.obtener(id));
    return preguntas.map(({ id: preguntaId, correcta }) => ({ preguntaId, correcta }));
  }

  private async obtener(id: string): Promise<ConfiguracionSimulacro> {
    const configuracion = await this.banco.buscarSimulacro(id);
    if (!configuracion) throw new ErrorBancoPreguntas('no-encontrado', 'Simulacro no encontrado.');
    return configuracion;
  }

  private async preguntasDisponibles(configuracion: ConfiguracionSimulacro) {
    const preguntas = await Promise.all(configuracion.preguntas.map(id => this.banco.buscar(id)));
    return preguntas.map(pregunta => {
      if (!pregunta?.habilitada) {
        throw new ErrorBancoPreguntas('conflicto', 'La selección incluye preguntas que no están aprobadas y habilitadas.');
      }
      return pregunta;
    });
  }
}
