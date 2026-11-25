import { ErrorRendicion } from './error-rendicion';
import { EstadoExamen } from './estado-examen';
import { Alternativa } from './respuesta';

export interface PreguntaVisible {
  id: string;
  cursoId: string;
  enunciado: string;
  alternativas: Record<Alternativa, string>;
}

export interface SimulacroVisible {
  id: string;
  duracionMinutos: number;
  preguntas: PreguntaVisible[];
}

export class Examen {
  constructor(
    readonly id: string,
    readonly postulanteId: string,
    readonly simulacroId: string,
    readonly inicio: Date,
    readonly vence: Date,
    readonly cierre: Date | null = null,
  ) {}

  get estado(): EstadoExamen {
    return this.cierre ? EstadoExamen.Finalizado : EstadoExamen.Activo;
  }

  verificarPropietario(postulanteId: string): void {
    if (this.postulanteId !== postulanteId) {
      throw new ErrorRendicion('no-encontrado', 'Examen no encontrado.');
    }
  }

  tiempoRestante(ahora: Date): number {
    return this.cierre ? 0 : Math.max(0, this.vence.getTime() - ahora.getTime());
  }

  verificarVigencia(ahora: Date): void {
    if (this.cierre) throw new ErrorRendicion('conflicto', 'El examen ya finalizó.');
    if (this.tiempoRestante(ahora) === 0) throw new ErrorRendicion('vencido', 'El plazo venció.');
  }

  finalizar(ahora: Date): Examen {
    if (this.cierre) return this;
    const cierre = new Date(Math.min(ahora.getTime(), this.vence.getTime()));
    return new Examen(this.id, this.postulanteId, this.simulacroId, this.inicio, this.vence, cierre);
  }
}

export function validarMarca(simulacro: SimulacroVisible, numero: number, alternativa: unknown): void {
  const pregunta = Number.isInteger(numero) ? simulacro.preguntas[numero - 1] : undefined;
  if (!pregunta || (alternativa !== null &&
    (typeof alternativa !== 'string' || !Object.hasOwnProperty.call(pregunta.alternativas, alternativa)))) {
    throw new ErrorRendicion('invalido', 'Número de pregunta o alternativa inválidos.');
  }
}
