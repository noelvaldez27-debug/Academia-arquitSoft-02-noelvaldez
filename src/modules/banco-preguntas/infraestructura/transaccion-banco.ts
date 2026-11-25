import { Pool, PoolClient } from 'pg';

export async function transaccionBanco<T>(pool: Pool, ejecutar: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await ejecutar(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
