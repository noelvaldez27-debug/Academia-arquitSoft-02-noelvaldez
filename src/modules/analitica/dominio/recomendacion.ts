import { ConteosCurso, totalEvaluado } from './estadisticas';

export function prioridades(cursos: ConteosCurso[]) {
  const suficientes = cursos.map(curso => ({ ...curso, total: totalEvaluado(curso) }))
    .filter(curso => curso.total >= 5);
  const seleccionados = suficientes
    .filter(curso => curso.correctas * 5 < curso.total * 3)
    .sort((a, b) => a.correctas * b.total - b.correctas * a.total || b.total - a.total ||
      (a.cursoId < b.cursoId ? -1 : Number(a.cursoId !== b.cursoId)))
    .slice(0, 3);
  return { hayEvidencia: suficientes.length > 0, seleccionados };
}

export interface Recomendacion {
  cursos: string[];
  contenido: string;
  origen: 'ia' | 'local';
  generadaEn: string;
}

export interface RecomendacionRepository {
  obtenerOCrear(postulanteId: string, huella: string, reglas: number,
    generar: () => Promise<Omit<Recomendacion, 'generadaEn'>>): Promise<Recomendacion>;
}
