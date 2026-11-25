import { Pool } from 'pg';
import { GeneradorCredenciales } from '../aplicacion/generar-credenciales';
import { PostgresCargaMasivaAdapter } from './postgres-carga-masiva.adapter';

function preparar() {
  const cliente = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
  const pool = { connect: async () => cliente } as unknown as Pool;
  return { cliente, adaptador: new PostgresCargaMasivaAdapter(pool, {} as GeneradorCredenciales) };
}

describe('PostgresCargaMasivaAdapter (CA-U13)', () => {
  it('confirma en una transacción el registro de los envíos pendientes', async () => {
    const { cliente, adaptador } = preparar();

    await adaptador.transaccion(async ({ guardarEnvios }) => guardarEnvios('carga', 2));

    expect(cliente.query.mock.calls).toEqual([
      ['BEGIN'],
      [expect.stringContaining('INSERT INTO envios_carga_masiva'), ['carga', 2]],
      ['COMMIT'],
    ]);
    expect(cliente.release).toHaveBeenCalledTimes(1);
  });

  it('revierte y libera la conexión si la operación de la fila falla', async () => {
    const { cliente, adaptador } = preparar();

    await expect(adaptador.transaccion(async () => { throw new Error('Fallo de persistencia'); }))
      .rejects.toThrow('Fallo de persistencia');

    expect(cliente.query.mock.calls).toEqual([['BEGIN'], ['ROLLBACK']]);
    expect(cliente.release).toHaveBeenCalledTimes(1);
  });
});
