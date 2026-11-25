import { Pool } from 'pg';
import { OperacionesExamen, TransaccionExamen } from '../aplicacion/transaccion-examen.port';
import { PostgresExamenRepository } from './postgres-examen-repository';
import { PostgresCierreSimulacro } from './postgres-cierre-simulacro';

export function crearTransaccionExamen(
  pool: Pool, consultas: (bd: Pick<Pool, 'query'>) => OperacionesExamen['consultarSimulacro'],
): TransaccionExamen {
  return async operar => {
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      const cierres = new PostgresCierreSimulacro(cliente);
      const resultado = await operar({
        examenes: new PostgresExamenRepository(cliente),
        consultarSimulacro: consultas(cliente),
        coordinarInicio: id => cierres.coordinarInicio(id),
        solicitarCierre: (id, administradorId) => cierres.solicitar(id, administradorId),
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
