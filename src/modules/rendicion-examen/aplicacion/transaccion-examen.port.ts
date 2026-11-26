import { ExamenRepository } from '../dominio/examen-repository';
import { DatosInicialesPostulante, SimulacroVisible } from '../dominio/examen';

export interface OperacionesExamen {
  examenes: ExamenRepository;
  consultarSimulacro(id: string): Promise<SimulacroVisible>;
  coordinarInicio?(id: string): Promise<boolean>;
  consultarPostulanteHabilitado?(id: string): Promise<DatosInicialesPostulante | null>;
  solicitarCierre?(id: string, administradorId: string): Promise<{
    administradorId: string; solicitadoEn: Date; cerradoEn: Date | null;
  }>;
}

export type TransaccionExamen = <T>(operar: (operaciones: OperacionesExamen) => Promise<T>) => Promise<T>;
