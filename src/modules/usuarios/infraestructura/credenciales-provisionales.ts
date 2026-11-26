import { createHmac, randomUUID } from 'node:crypto';
import type { ServicioHash } from '../aplicacion/servicio-hash.port';
import type { EmisionProvisional } from '../dominio/emision-provisional';

export class CredencialesProvisionales {
  constructor(private readonly clave: string, private readonly hash: ServicioHash) {}

  async emitir(administradorId: string, cargaId?: string): Promise<EmisionProvisional> {
    const referencia = randomUUID();
    return { referencia, administradorId, cargaId, passwordHash: await this.hash.generarHash(this.derivar(referencia)) };
  }

  derivar(referencia: string): string {
    return createHmac('sha256', this.clave).update('evalua/credencial-provisional/v1:' + referencia)
      .digest('base64url').slice(0, 32);
  }
}
