import { ExamenRepository } from '../dominio/examen-repository';
import { FinalizarExamenUseCase } from './finalizar-examen.use-case';
import { Reloj } from './reloj.port';

export class ExpirarExamenes {
  constructor(
    private readonly examenes: ExamenRepository,
    private readonly finalizar: FinalizarExamenUseCase,
    private readonly reloj: Reloj,
    private readonly informarError: (error: unknown) => void,
  ) {}

  async ejecutar(limite: number): Promise<void> {
    for (const id of await this.examenes.buscarVencidos(this.reloj(), limite)) {
      try {
        await this.finalizar.expirar(id);
      } catch (error) {
        this.informarError(error);
      }
    }
  }
}
