/**
 * Puerto para el servicio de hash y verificación de contraseñas (AC04).
 */
export interface ServicioHash {
  generarHash(textoPlano: string): Promise<string>;
  comparar(textoPlano: string, hash: string): Promise<boolean>;
}
