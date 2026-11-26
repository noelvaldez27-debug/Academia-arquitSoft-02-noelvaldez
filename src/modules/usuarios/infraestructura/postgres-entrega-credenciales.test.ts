import type { Pool } from 'pg';
import { CredencialesProvisionales } from './credenciales-provisionales';
import { PostgresEntregaCredenciales } from './postgres-entrega-credenciales';

test('CA-VS01 un fallo de generación revierte el consumo antes de responder', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ correo: 'sintetico@example.invalid', referencia: 'referencia' }] })
    .mockResolvedValueOnce({ rows: [] });
  const release = jest.fn();
  const pool = { connect: async () => ({ query, release }) } as unknown as Pool;
  const provisionales = new CredencialesProvisionales('clave-sintetica', { generarHash: jest.fn(), comparar: jest.fn() });
  jest.spyOn(provisionales, 'derivar').mockImplementation(() => { throw new Error('Fallo simulado'); });
  const entregas = new PostgresEntregaCredenciales(pool, provisionales);
  await expect(entregas.descargar('1', null, 'carga', true)).rejects.toThrow('Fallo simulado');
  expect(query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(release).toHaveBeenCalledTimes(1);
});
