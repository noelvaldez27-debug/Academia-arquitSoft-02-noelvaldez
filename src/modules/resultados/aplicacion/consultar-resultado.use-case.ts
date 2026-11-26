import { ExamenesFinalizadosPort } from '../dominio/fuentes-resultado.port';
import { Resultado } from '../dominio/resultado';

export type NombresCursos = (ids: string[]) => Promise<{ id: string; nombre: string }[]>;

export class ConsultarResultadoUseCase {
  constructor(
    private readonly buscar: (id: string) => Promise<Resultado | null>,
    private readonly examenes: ExamenesFinalizadosPort,
    private readonly nombresCursos: NombresCursos,
  ) {}

  async ejecutar(id: string, postulanteId: string) {
    const resultado = await this.buscar(id);
    if (resultado) {
      if (resultado.postulanteId !== postulanteId) return null;
      const { examenId, simulacroId, puntajeCentesimos, correctas, incorrectas, omitidas, porCurso } = resultado;
      const nombres = new Map((await this.nombresCursos(porCurso.map(curso => curso.cursoId)))
        .map(curso => [curso.id, curso.nombre]));
      return { estado: 'PROCESADO' as const, examenId, simulacroId, puntaje: puntajeCentesimos / 100,
        correctas, incorrectas, omitidas, porCurso: porCurso.map(curso => ({
          ...curso, cursoNombre: nombres.get(curso.cursoId) ?? null,
        })) };
    }
    const examen = await this.examenes.consultar(id);
    return examen?.postulanteId === postulanteId ? { estado: 'PENDIENTE' as const, examenId: id } : null;
  }
}
