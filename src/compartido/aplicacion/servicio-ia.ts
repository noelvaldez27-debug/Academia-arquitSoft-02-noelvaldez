/**
 * Alternativa de una pregunta propuesta por IA.
 */
export interface AlternativaPropuesta {
  texto: string;
  esCorrecta: boolean;
}

/**
 * Pregunta propuesta generada por IA a partir de una separata.
 * Referencia: ADR-010, ADR-011, patrones-de-diseno.md.
 */
export interface PreguntaPropuesta {
  enunciado: string;
  alternativas: AlternativaPropuesta[];
  explicacion?: string;
}

/**
 * Puerto compartido para el servicio de inteligencia artificial.
 * Referencia: ADR-010, ADR-011, DA11.
 */
export interface AdjuntoLecturaIA {
  mime: 'image/jpeg' | 'image/png' | 'application/pdf';
  contenido: Uint8Array;
}

export interface ServicioIA {
  leerAdjunto(adjunto: AdjuntoLecturaIA): Promise<string>;
  proponer(texto: string, curso: string): Promise<PreguntaPropuesta[]>;
  recomendar(cursosDebiles: string[]): Promise<string>;
}
