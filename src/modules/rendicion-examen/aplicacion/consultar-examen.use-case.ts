import { Examen, SimulacroVisible } from '../dominio/examen';
import { ExamenRepository } from '../dominio/examen-repository';
import { consultarPropio } from './iniciar-examen.use-case';
import { Reloj } from './reloj.port';
import { RespuestasTemporales } from './respuestas-temporales.port';
import { TransaccionExamen } from './transaccion-examen.port';

export class ConsultarExamenUseCase {
  constructor(
    private readonly transaccion: TransaccionExamen,
    private readonly temporales: RespuestasTemporales,
    private readonly reloj: Reloj,
  ) {}

  ejecutar(id: string, postulanteId: string) {
    return consultarPropio(this.transaccion, id, postulanteId, (examen, simulacro, examenes) =>
      this.proyectar(examen, simulacro, examenes));
  }

  private async proyectar(examen: Examen, simulacro: SimulacroVisible, examenes: ExamenRepository) {
    const respuestas = examen.cierre
      ? (await examenes.consultarFinalizado(examen.id))!.respuestas
      : await this.temporales.listar(examen.id);
    return {
      id: examen.id, simulacroId: examen.simulacroId, inicio: examen.inicio, vence: examen.vence,
      cierre: examen.cierre, estado: examen.estado, tiempoRestanteMs: examen.tiempoRestante(this.reloj()),
      preguntas: simulacro.preguntas, respuestas,
    };
  }
}
