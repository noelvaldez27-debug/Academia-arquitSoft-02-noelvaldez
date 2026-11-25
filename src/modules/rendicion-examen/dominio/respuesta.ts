export type Alternativa = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Respuesta {
  numero: number;
  alternativa: Alternativa | null;
  revision: number;
}
