import jwt from 'jsonwebtoken';
import { ServicioToken, PayloadToken } from '../aplicacion/servicio-token.port';
import { RolUsuario } from '../dominio';

export interface ConfigJwt {
  secret?: string;
  duracion?: string;
  nodeEnv?: string;
}

/**
 * Adaptador de autenticación JWT basado en jsonwebtoken (ADR-007, ADR-008, AC04).
 * Valida la existencia y robustez de JWT_SECRET en entornos de producción.
 */
export class JsonWebTokenAdapter implements ServicioToken {
  private readonly secret: string;
  private readonly duracion: string;

  constructor(config?: ConfigJwt) {
    const nodeEnv = config?.nodeEnv ?? process.env.NODE_ENV ?? 'development';
    const secret = config?.secret ?? process.env.JWT_SECRET;
    const duracion = config?.duracion ?? process.env.JWT_DURACION ?? '8h';

    if (!secret || secret.trim() === '') {
      throw new Error('Falta la variable de entorno JWT_SECRET requerida para la autenticacion.');
    }

    if (nodeEnv === 'production' && secret.startsWith('cambiar_')) {
      throw new Error('JWT_SECRET no seguro para produccion: no se permite una clave que empiece por cambiar_ en NODE_ENV=production.');
    }

    this.secret = secret.trim();
    this.duracion = duracion;
  }

  public async generarToken(payload: PayloadToken): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        {
          id: payload.id,
          rol: payload.rol,
          sedeId: payload.sedeId,
          ...(payload.versionSesion !== undefined && { versionSesion: payload.versionSesion }),
        },
        this.secret,
        {
          expiresIn: this.duracion as jwt.SignOptions['expiresIn'],
        },
        (err, token) => {
          if (err || !token) {
            return reject(new Error('Error al generar el token JWT.'));
          }
          resolve(token);
        }
      );
    });
  }

  public async verificarToken(token: string): Promise<PayloadToken> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.secret, (err, decoded) => {
        if (err || !decoded) {
          return reject(new Error('Token JWT invalido o expirado.'));
        }
        const dec = decoded as { id: string; rol: RolUsuario; sedeId?: string | null; versionSesion?: number };
        resolve({
          id: dec.id,
          rol: dec.rol,
          sedeId: dec.sedeId ?? null,
          ...(dec.versionSesion !== undefined && { versionSesion: dec.versionSesion }),
        });
      });
    });
  }
}
