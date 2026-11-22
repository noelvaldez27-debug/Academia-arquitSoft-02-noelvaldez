import { ServicioHash } from './servicio-hash.port';

export interface CredencialesGeneradas {
  correo: string;
  passwordHash: string;
}

/**
 * Generador automático de credenciales para postulantes y docentes (RF02, RF19, HU02, CA-U02).
 * Formato de correo: dni@sofia.edu
 * Contraseña inicial: igual al DNI, guardada exclusivamente con hash (AC04).
 */
export class GeneradorCredenciales {
  constructor(private readonly servicioHash: ServicioHash) {}

  public static generarCorreoDni(dni: string): string {
    const dniLimpio = dni.trim();
    if (!/^\d{8}$/.test(dniLimpio)) {
      throw new Error('El DNI debe tener exactamente 8 digitos numericos para generar credenciales.');
    }
    return `${dniLimpio}@sofia.edu`;
  }

  public async generarParaDni(dni: string): Promise<CredencialesGeneradas> {
    const correo = GeneradorCredenciales.generarCorreoDni(dni);
    const passwordHash = await this.servicioHash.generarHash(dni.trim());

    return {
      correo,
      passwordHash,
    };
  }
}
