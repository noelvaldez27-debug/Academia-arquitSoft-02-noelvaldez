import { Examen } from './examen';
import { Respuesta } from './respuesta';

export interface ExamenFinalizado {
  examenId: string;
  postulanteId: string;
  simulacroId: string;
  respuestas: Respuesta[];
}

export interface ExamenRepository {
  buscar(id: string): Promise<Examen | null>;
  buscarIntento(postulanteId: string, simulacroId: string): Promise<Examen | null>;
  insertar(examen: Examen): Promise<Examen>;
  consolidar(examen: Examen, respuestas: Respuesta[]): Promise<void>;
  consultarFinalizado(id: string): Promise<ExamenFinalizado | null>;
  buscarVencidos(ahora: Date, limite: number): Promise<string[]>;
}
