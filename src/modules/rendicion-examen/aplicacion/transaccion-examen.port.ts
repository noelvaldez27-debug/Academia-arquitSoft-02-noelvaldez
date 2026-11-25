import { ExamenRepository } from '../dominio/examen-repository';
import { SimulacroVisible } from '../dominio/examen';

export interface OperacionesExamen {
  examenes: ExamenRepository;
  consultarSimulacro(id: string): Promise<SimulacroVisible>;
}

export type TransaccionExamen = <T>(operar: (operaciones: OperacionesExamen) => Promise<T>) => Promise<T>;
