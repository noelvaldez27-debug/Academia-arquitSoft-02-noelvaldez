export interface ExtractorDeTextoPort {
  extraer(contenido: Buffer): Promise<string>;
}
