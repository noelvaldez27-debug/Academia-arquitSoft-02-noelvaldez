import type { Pool } from 'pg';
import { PostgresRecomendacionRepository } from './postgres-recomendacion-repository';

test('CA-AE03 si falla la escritura se revierte y se devuelve la conexión al pool', async () => {
  const cliente = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('INSERT')) throw new Error('Fallo de guardado');
      return { rows: [] };
    }),
    release: jest.fn(),
  };
  const pool = { connect: async () => cliente } as unknown as Pool;
  const repo = new PostgresRecomendacionRepository(pool);
  await expect(repo.obtenerOCrear('p', 'huella', 1, async () =>
    ({ cursos: ['c'], contenido: 'Repaso', origen: 'local' }))).rejects.toThrow('Fallo de guardado');
  expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
  expect(cliente.release).toHaveBeenCalledTimes(1);
});
