import { ErrorAccesoDenegado, ErrorValidacion } from '../dominio';
import type { ServicioHash } from './servicio-hash.port';
import type { GeneradorPasswordTemporalPort } from './generador-password-temporal.port';
import type { RestablecerPasswordPort } from './restablecer-password.port';

export class RestablecerPasswordUseCase {
  constructor(
    private readonly restablecimiento: RestablecerPasswordPort,
    private readonly generador: GeneradorPasswordTemporalPort,
    private readonly hash: ServicioHash,
  ) {}

  async ejecutar(targetId: string, actorId: string, identidadVerificada: boolean) {
    if (!identidadVerificada) throw new ErrorValidacion('Confirma la verificación de identidad antes de continuar.');
    if (!/^\d+$/.test(targetId) || !/^\d+$/.test(actorId)) {
      throw new ErrorValidacion('El identificador de usuario no es válido.');
    }
    const passwordTemporal = this.generador.generar();
    const passwordHash = await this.hash.generarHash(passwordTemporal);
    const venceEn = await this.restablecimiento.ejecutar(targetId, actorId, passwordHash);
    if (!venceEn) throw new ErrorAccesoDenegado('No se pudo restablecer la contraseña para este usuario.');
    return { passwordTemporal, venceEn: venceEn.toISOString() };
  }
}
