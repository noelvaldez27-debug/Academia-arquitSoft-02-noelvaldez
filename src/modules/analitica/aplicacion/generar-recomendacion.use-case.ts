import { ConsultarHistorialUseCase } from './consultar-historial.use-case';
import { prioridades, RecomendacionRepository } from '../dominio/recomendacion';
import { porcentaje } from '../dominio/estadisticas';

interface TemaHistorico {
  cursoId: string;
  tema: { id: string; nombre: string } | null;
}

interface ContextoCurso {
  nombre: string;
  desempeno: number;
  temas: string[];
}

export class GenerarRecomendacionUseCase {
  constructor(
    private readonly historial: ConsultarHistorialUseCase,
    private readonly repositorio: RecomendacionRepository,
    private readonly huella: (examenes: string[]) => string,
    private readonly nombres: (ids: string[]) => Promise<{ id: string; nombre: string }[]>,
    private readonly temas: (ids: string[]) => Promise<TemaHistorico[]>,
    private readonly recomendar: ((cursos: ContextoCurso[]) => Promise<string>) | undefined,
    private readonly informarFallo: () => void,
  ) {}

  async ejecutar(postulanteId: string) {
    const { porCurso, resultados } = await this.historial.ejecutar(postulanteId);
    const { hayEvidencia, seleccionados } = prioridades(porCurso);
    if (!seleccionados.length) {
      return { estado: hayEvidencia ? 'sin_prioridades' as const : 'evidencia_insuficiente' as const };
    }
    const ids = seleccionados.map(curso => curso.cursoId);
    const huella = this.huella(resultados.map(resultado => resultado.examenId).sort());
    const versionReglas = 1;
    // Preparar el contexto antes de tomar el bloqueo evita pedir otra conexi?n mientras se genera.
    const [nombres, temas] = await Promise.all([
      this.nombres(ids), this.temas([...new Set(resultados.map(resultado => resultado.simulacroId))]),
    ]);
    const nombresPorId = new Map(nombres.map(curso => [curso.id, curso.nombre]));
    const temasPorCurso = new Map<string, Set<string>>();
    for (const { cursoId, tema } of temas) {
      if (!tema) continue;
      const nombresTema = temasPorCurso.get(cursoId) ?? new Set<string>();
      nombresTema.add(tema.nombre);
      temasPorCurso.set(cursoId, nombresTema);
    }
    const contexto = seleccionados.map((curso, i) => ({
      nombre: nombresPorId.get(curso.cursoId) ?? ('Curso prioritario ' + (i + 1)),
      desempeno: porcentaje(curso.correctas, curso.total),
      temas: [...(temasPorCurso.get(curso.cursoId) ?? [])].sort().slice(0, 5),
    }));
    const recomendacion = await this.repositorio.obtenerOCrear(postulanteId, huella, versionReglas, async () => {
      if (this.recomendar) {
        try {
          const texto = await this.recomendar(contexto);
          if (typeof texto !== 'string' || !texto.trim() || texto.length > 4000) throw new Error();
          return { cursos: ids, contenido: texto.trim(), origen: 'ia' };
        } catch {
          this.informarFallo();
        }
      }
      return { cursos: ids, origen: 'local', contenido: contexto.map(curso =>
        curso.nombre + ': repasa los conceptos y resuelve ejercicios. Revisa tus errores al terminar.').join('\n') };
    });
    return { estado: 'vigente' as const, versionReglas, ...recomendacion };
  }
}
