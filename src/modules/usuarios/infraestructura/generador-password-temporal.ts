import { randomBytes } from 'node:crypto';
import type { GeneradorPasswordTemporalPort } from '../aplicacion/generador-password-temporal.port';

export class GeneradorPasswordTemporal implements GeneradorPasswordTemporalPort {
  generar(): string {
    return randomBytes(24).toString('base64url');
  }
}
