import { createHmac, randomUUID } from 'node:crypto';
import type { ServicioHash } from '../aplicacion/servicio-hash.port';
import type { EmisionProvisional } from '../dominio/emision-provisional';

export class CredencialesProvisionales {
  constructor(private readonly clave: string, private readonly hash: ServicioHash,
    private readonly passwordInicialDni = false) {}

  async emitir(administradorId: string, cargaId?: string): Promise<EmisionProvisional> {
    const referencia = randomUUID();
    return { referencia, administradorId, cargaId, tipoPassword: 'ALEATORIA', requiereCambio: true,
      passwordHash: await this.hash.generarHash(this.derivar(referencia)) };
  }

  async emitirInicial(administradorId: string, dni: string, cargaId?: string): Promise<EmisionProvisional> {
    if (!/^\d{8}$/.test(dni)) throw new Error('El DNI debe tener exactamente ocho dígitos.');
    const referencia = randomUUID();
    const tipoPassword = this.passwordInicialDni ? 'DNI' : 'ALEATORIA';
    const password = this.passwordInicialDni ? dni : this.derivar(referencia);
    return { referencia, administradorId, cargaId, tipoPassword, requiereCambio: false,
      passwordHash: await this.hash.generarHash(password) };
  }

  derivar(referencia: string): string {
    return createHmac('sha256', this.clave).update('evalua/credencial-provisional/v1:' + referencia)
      .digest('base64url').slice(0, 32);
  }
}
