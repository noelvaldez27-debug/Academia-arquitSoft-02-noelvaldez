import { Conteos, IntentoCerrado, porcentaje, ResultadoAcademico, totalEvaluado } from '../dominio/estadisticas';
import { paginar } from './paginar';

export type ActorEstadisticas = { rol: 'general' | 'docente'; id: string } |
  { rol: 'sede'; id: string; sedeId: string };

export interface FiltrosEstadisticas {
  simulacroId?: string;
  cursoId?: string;
  temaId?: string;
  sedeId?: string;
}

export interface PreguntaHistorica {
  simulacroId: string;
  preguntaId: string;
  cursoId: string;
  enunciado: string;
  huellaInterna: string;
  tema: { id: string; nombre: string } | null;
}

interface ResultadoGrupal extends ResultadoAcademico {
  detalle: { preguntaId: string; cursoId: string; correccion: keyof Conteos }[];
}

interface GrupoTema {
  cursoId: string;
  temaId: string | null;
  nombresHistoricos: Set<string>;
  conteos: Conteos;
}
interface GrupoPregunta {
  preguntaId: string;
  cursoId: string;
  enunciado: string | null;
  versionesSimulacro: Set<string>;
  conteos: Conteos;
}

export class ErrorEstadisticas extends Error {
  constructor(readonly estado: 400 | 403, mensaje: string) { super(mensaje); }
}

export class ConsultarEstadisticasUseCase {
  constructor(
    private readonly resultados: (simulacroId: string | undefined, cursor?: string) => Promise<ResultadoGrupal[]>,
    private readonly intentos: (ids: string[]) => Promise<IntentoCerrado[]>,
    private readonly preguntas: (ids: string[]) => Promise<PreguntaHistorica[]>,
    private readonly cursosAsignados: (docenteId: string) => Promise<string[]>,
  ) {}

  async ejecutar(actor: ActorEstadisticas, filtros: FiltrosEstadisticas) {
    const asignados = actor.rol === 'docente' ? new Set(await this.cursosAsignados(actor.id)) : undefined;
    if (asignados && filtros.cursoId && !asignados.has(filtros.cursoId)) {
      throw new ErrorEstadisticas(403, 'El curso no esta asignado al docente.');
    }
    if (actor.rol === 'sede' && filtros.sedeId && filtros.sedeId !== actor.sedeId) {
      throw new ErrorEstadisticas(403, 'La sede solicitada esta fuera de su alcance.');
    }
    const sedeId = actor.rol === 'sede' ? actor.sedeId : filtros.sedeId;
    const porCurso = new Map<string, Conteos>();
    const porTema = new Map<string, GrupoTema>();
    const porPregunta = new Map<string, GrupoPregunta>();
    const versiones = new Map<string, Map<string, PreguntaHistorica>>();
    let intentosSinSedeHistorica = 0;

    if (!asignados || asignados.size) {
      for await (const lote of paginar(cursor => this.resultados(filtros.simulacroId, cursor), fila => fila.examenId)) {
        const cierres = new Map((await this.intentos(lote.map(fila => fila.examenId))).map(fila => [fila.id, fila]));
        const validos = lote.filter(fila => {
          const cierre = cierres.get(fila.examenId);
          return cierre && cierre.postulanteId === fila.postulanteId && cierre.simulacroId === fila.simulacroId &&
            (!sedeId || cierre.sedeId === sedeId);
        });
        const faltantes = [...new Set(validos.map(fila => fila.simulacroId))]
          .filter(id => !versiones.has(id));
        if (faltantes.length) {
          for (const id of faltantes) versiones.set(id, new Map());
          for (const pregunta of await this.preguntas(faltantes)) {
            versiones.get(pregunta.simulacroId)?.set(pregunta.preguntaId, pregunta);
          }
        }
        for (const fila of validos) {
          const historicas = versiones.get(fila.simulacroId);
          let incluido = false;
          for (const detalle of fila.detalle) {
            const { cursoId, preguntaId, correccion } = detalle;
            if ((asignados && !asignados.has(cursoId)) || (filtros.cursoId && filtros.cursoId !== cursoId)) continue;
            const congelada = historicas?.get(preguntaId);
            const historica = congelada?.cursoId === cursoId ? congelada : undefined;
            const tema = historica?.tema;
            if (filtros.temaId && filtros.temaId !== (tema?.id ?? 'sin-clasificar')) continue;
            incluido = true;

            const curso = porCurso.get(cursoId) ?? inicializar();
            curso[correccion]++;
            porCurso.set(cursoId, curso);

            const llaveTema = JSON.stringify([cursoId, tema?.id ?? null]);
            const grupoTema = porTema.get(llaveTema) ?? {
              cursoId, temaId: tema?.id ?? null, nombresHistoricos: new Set<string>(), conteos: inicializar(),
            };
            if (tema) grupoTema.nombresHistoricos.add(tema.nombre);
            grupoTema.conteos[correccion]++;
            porTema.set(llaveTema, grupoTema);

            const llavePregunta = JSON.stringify([cursoId, preguntaId,
              historica ? ['contenido', historica.huellaInterna] : ['simulacro', fila.simulacroId]]);
            const grupoPregunta = porPregunta.get(llavePregunta) ?? {
              cursoId, preguntaId, enunciado: historica?.enunciado ?? null,
              versionesSimulacro: new Set<string>(), conteos: inicializar(),
            };
            grupoPregunta.versionesSimulacro.add(fila.simulacroId);
            grupoPregunta.conteos[correccion]++;
            porPregunta.set(llavePregunta, grupoPregunta);
          }
          if (incluido && cierres.get(fila.examenId)?.sedeId === null) intentosSinSedeHistorica++;
        }
      }
    }
    return {
      intentosSinSedeHistorica,
      porCurso: [...porCurso].map(([cursoId, conteos]) => ({ cursoId, ...indicadores(conteos) })).sort(porError),
      porTema: [...porTema.values()].map(({ conteos, nombresHistoricos, ...tema }) =>
        ({ ...tema, nombresHistoricos: [...nombresHistoricos].sort(), ...indicadores(conteos) })).sort(porError),
      porPregunta: [...porPregunta.values()].map(({ conteos, versionesSimulacro, ...pregunta }) =>
        ({ ...pregunta, versionesSimulacro: [...versionesSimulacro].sort(), ...indicadores(conteos) })).sort(porError),
    };
  }
}

function inicializar(): Conteos {
  return { correctas: 0, incorrectas: 0, omitidas: 0 };
}

function indicadores(conteos: Conteos) {
  const total = totalEvaluado(conteos);
  return {
    ...conteos, total, tasaAciertos: porcentaje(conteos.correctas, total),
    tasaErrores: porcentaje(conteos.incorrectas, total), tasaOmisiones: porcentaje(conteos.omitidas, total),
  };
}

function porError(a: { incorrectas: number; total: number }, b: { incorrectas: number; total: number }) {
  return b.incorrectas * a.total - a.incorrectas * b.total;
}
