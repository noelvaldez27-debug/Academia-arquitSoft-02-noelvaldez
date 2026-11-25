import { ExamenesFinalizadosPort } from '../dominio/fuentes-resultado.port';
import { Resultado } from '../dominio/resultado';

export class ConsultarResultadoUseCase {
  constructor(
    private readonly buscar: (id: string) => Promise<Resultado | null>,
    private readonly examenes: ExamenesFinalizadosPort,
  ) {}

  async ejecutar(id: string, postulanteId: string) {
    const resultado = await this.buscar(id);
    if (resultado) {
      if (resultado.postulanteId !== postulanteId) return null;
      const { examenId, simulacroId, puntajeCentesimos, correctas, incorrectas, omitidas, porCurso } = resultado;
      return { estado: 'PROCESADO' as const, examenId, simulacroId, puntaje: puntajeCentesimos / 100,
        correctas, incorrectas, omitidas, porCurso };
    }
    const examen = await this.examenes.consultar(id);
    return examen?.postulanteId === postulanteId ? { estado: 'PENDIENTE' as const, examenId: id } : null;
  }
}
