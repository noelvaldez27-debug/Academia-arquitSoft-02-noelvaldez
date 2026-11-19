import { Pool, PoolConfig } from 'pg';

function obtenerVariableEntorno(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || valor.trim() === '') {
    throw new Error(`Variable de entorno requerida no configurada: ${nombre}`);
  }
  return valor;
}

export function obtenerConfiguracionPostgresDesdeEnv(): PoolConfig {
  const host = obtenerVariableEntorno('DB_HOST');
  const puertoStr = obtenerVariableEntorno('DB_PORT');
  const database = obtenerVariableEntorno('DB_NAME');
  const user = obtenerVariableEntorno('DB_USER');
  const password = obtenerVariableEntorno('DB_PASSWORD');

  const port = parseInt(puertoStr, 10);
  if (isNaN(port)) {
    throw new Error(`La variable de entorno DB_PORT debe ser un número válido: ${puertoStr}`);
  }

  return {
    host,
    port,
    database,
    user,
    password,
  };
}

export function crearPoolPostgres(configuracion?: PoolConfig): Pool {
  const config = configuracion ?? obtenerConfiguracionPostgresDesdeEnv();
  return new Pool(config);
}

export async function cerrarPoolPostgres(pool: Pool): Promise<void> {
  await pool.end();
}
