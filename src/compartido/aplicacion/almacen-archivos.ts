/**
 * Puerto compartido para el almacenamiento de archivos (separatas).
 * Referencia: ADR-012, DA12.
 */
export interface AlmacenArchivos {
  guardar(rutaRelativa: string, contenido: Buffer): Promise<string>;
  obtener(rutaRelativa: string): Promise<Buffer>;
}
