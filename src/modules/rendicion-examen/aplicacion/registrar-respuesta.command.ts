import { Alternativa } from '../dominio/respuesta';

export interface RegistrarRespuestaCommand {
  numero: number;
  alternativa: Alternativa | null;
  revisionBase: number;
  operacionId: string;
}
