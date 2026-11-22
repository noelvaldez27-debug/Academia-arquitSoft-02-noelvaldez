import bcrypt from 'bcryptjs';
import { ServicioHash } from '../aplicacion/servicio-hash.port';

/**
 * Adaptador de hash de contraseñas utilizando bcryptjs (AC04).
 * Funciona de forma nativa en JavaScript sin dependencias binarias,
 * garantizando compatibilidad directa con node:20-alpine sin compiladores en la imagen final.
 */
export class BcryptjsHashAdapter implements ServicioHash {
  private readonly rondas: number;

  constructor(rondas = 10) {
    this.rondas = rondas;
  }

  public async generarHash(textoPlano: string): Promise<string> {
    if (!textoPlano || textoPlano.trim() === '') {
      throw new Error('El texto para generar hash no puede estar vacio.');
    }
    return bcrypt.hash(textoPlano, this.rondas);
  }

  public async comparar(textoPlano: string, hash: string): Promise<boolean> {
    if (!textoPlano || !hash) {
      return false;
    }
    return bcrypt.compare(textoPlano, hash);
  }
}
