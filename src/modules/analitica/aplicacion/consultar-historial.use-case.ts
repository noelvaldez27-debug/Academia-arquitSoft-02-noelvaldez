import { acumular, ConteosCurso, IntentoCerrado, porcentaje, ResultadoAcademico, totalEvaluado } from '../dominio/estadisticas';
import { paginar } from './paginar';

export class ConsultarHistorialUseCase {
  constructor(
    private readonly resultados: (postulanteId: string, cursor?: string) => Promise<ResultadoAcademico[]>,
    private readonly intentos: (ids: string[], postulanteId: string) => Promise<IntentoCerrado[]>,
  ) {}

  async ejecutar(postulanteId: string) {
    const historial: {
      simulacroId: string; fecha: string; puntaje: number; correctas: number; incorrectas: number; omitidas: number;
    }[] = [];
    const cursos = new Map<string, ConteosCurso>();
    const resultados = [];
    for await (const lote of paginar(cursor => this.resultados(postulanteId, cursor), resultado => resultado.examenId)) {
      const intentos = new Map((await this.intentos(lote.map(fila => fila.examenId), postulanteId))
        .map(intento => [intento.id, intento]));
      for (const fila of lote) {
        const intento = intentos.get(fila.examenId);
        if (!intento || fila.postulanteId !== postulanteId || intento.postulanteId !== postulanteId ||
            intento.simulacroId !== fila.simulacroId) continue;
        const { simulacroId, puntajeCentesimos, correctas, incorrectas, omitidas } = fila;
        historial.push({
          simulacroId, fecha: intento.cierre.toISOString(), puntaje: puntajeCentesimos / 100,
          correctas, incorrectas, omitidas,
        });
        resultados.push({ examenId: fila.examenId, simulacroId });
        for (const conteos of fila.porCurso) {
          if (!totalEvaluado(conteos)) continue;
          const curso = cursos.get(conteos.cursoId);
          if (curso) acumular(curso, conteos);
          else cursos.set(conteos.cursoId, { ...conteos });
        }
      }
    }
    historial.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.simulacroId.localeCompare(b.simulacroId));
    const porCurso = [...cursos.values()].sort((a, b) => a.cursoId.localeCompare(b.cursoId)).map(curso => {
      const total = totalEvaluado(curso);
      return { ...curso, total, desempeno: porcentaje(curso.correctas, total) };
    });
    return { historial, porCurso, resultados };
  }
}
