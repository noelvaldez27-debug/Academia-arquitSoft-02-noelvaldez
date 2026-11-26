import { Redis } from 'ioredis';
import type { CacheConsultas } from '../aplicacion/cache-consultas.port';

export class RedisCacheConsultas implements CacheConsultas {
  constructor(private readonly redis: Pick<Redis, 'get' | 'set' | 'del'>) {}

  async leer<T>(clave: string, validar: (valor: unknown) => valor is T): Promise<T | undefined> {
    try {
      const dato = await this.redis.get(clave);
      if (dato === null) return undefined;
      const valor: unknown = JSON.parse(dato);
      return validar(valor) ? valor : undefined;
    } catch {
      return undefined;
    }
  }

  async guardar(clave: string, valor: unknown, segundos: number): Promise<void> {
    try {
      await this.redis.set(clave, JSON.stringify(valor), 'EX', segundos);
    } catch {
      // La lectura definitiva permanece disponible en PostgreSQL.
    }
  }

  async eliminar(clave: string): Promise<void> {
    try {
      await this.redis.del(clave);
    } catch {
      // La generación vigente impide reutilizar la entrada anterior.
    }
  }
}

export function crearCacheConsultas(): CacheConsultas | undefined {
  const host = process.env.REDIS_CACHE_HOST?.trim();
  if (!host) return undefined;
  const redis = new Redis({
    host,
    password: process.env.REDIS_CACHE_PASSWORD,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
    commandTimeout: 150,
    autoResendUnfulfilledCommands: false,
  });
  redis.on('error', () => undefined);
  return new RedisCacheConsultas(redis);
}
