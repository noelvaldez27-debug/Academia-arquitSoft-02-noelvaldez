import { ClaveRespuestasPort, ExamenesFinalizadosPort } from '../dominio/fuentes-resultado.port';
import { calificar, ErrorIntegridadResultado } from '../dominio/resultado';
import { ResultadoRepository } from '../dominio/resultado-repository';

export class ProcesarResultadoUseCase {
  constructor(
    private readonly resultados: ResultadoRepository,
    private readonly examenes: ExamenesFinalizadosPort,
    private readonly claves: ClaveRespuestasPort,
  ) {}

  async ejecutar(id: string): Promise<void> {
    if (await this.resultados.existePorExamen(id)) return;
    const examen = await this.examenes.consultar(id);
    if (!examen || examen.examenId !== id) throw new ErrorIntegridadResultado('El examen finalizado no está disponible.');
    const claves = await this.claves.clave(examen.simulacroId);
    if (!claves) throw new ErrorIntegridadResultado('La versión congelada no está disponible.');
    await this.resultados.guardarSiNoExiste(calificar(examen, claves));
  }
}
