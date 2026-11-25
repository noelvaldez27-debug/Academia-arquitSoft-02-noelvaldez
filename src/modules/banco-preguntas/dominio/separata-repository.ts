import { PreguntaPropuesta } from './pregunta-propuesta';
import { AutorizacionExterna, Separata } from './separata';

export interface SeparataRepository {
  buscar(id: string): Promise<Separata | null>;
  guardar(separata: Separata, publicar?: boolean): Promise<void>;
  autorizacion(id: string): Promise<AutorizacionExterna | null>;
  guardarAutorizacion(autorizacion: AutorizacionExterna): Promise<void>;
  listarPropuestas(id: string): Promise<PreguntaPropuesta[]>;
  guardarPropuestas(separata: Separata, propuestas: PreguntaPropuesta[]): Promise<void>;
}
