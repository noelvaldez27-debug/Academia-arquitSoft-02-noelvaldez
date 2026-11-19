import Redis, { RedisOptions } from 'ioredis';

function obtenerVariableEntorno(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || valor.trim() === '') {
    throw new Error(`Variable de entorno requerida no configurada: ${nombre}`);
  }
  return valor;
}

export function obtenerConfiguracionRedisDesdeEnv(): RedisOptions {
  const host = obtenerVariableEntorno('REDIS_HOST');
  const puertoStr = obtenerVariableEntorno('REDIS_PORT');
  const password = obtenerVariableEntorno('REDIS_PASSWORD');

  const port = parseInt(puertoStr, 10);
  if (isNaN(port)) {
    throw new Error(`La variable de entorno REDIS_PORT debe ser un número válido: ${puertoStr}`);
  }

  return {
    host,
    port,
    password,
  };
}

export function crearClienteRedis(configuracion?: RedisOptions): Redis {
  const config = configuracion ?? obtenerConfiguracionRedisDesdeEnv();
  return new Redis(config);
}

export async function cerrarClienteRedis(cliente: Redis): Promise<void> {
  if (cliente.status !== 'end') {
    await cliente.quit();
  }
}
