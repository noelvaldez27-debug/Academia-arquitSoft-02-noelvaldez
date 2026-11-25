import { Pool } from 'pg';
import { OperacionesExamen, TransaccionExamen } from '../aplicacion/transaccion-examen.port';
import { PostgresExamenRepository } from './postgres-examen-repository';

export function crearTransaccionExamen(
  pool: Pool, consultas: (bd: Pick<Pool, 'query'>) => OperacionesExamen['consultarSimulacro'],
): TransaccionExamen {
  return async operar => {
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await operar({
        examenes: new PostgresExamenRepository(cliente),
        consultarSimulacro: consultas(cliente),
      });
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  };
}
