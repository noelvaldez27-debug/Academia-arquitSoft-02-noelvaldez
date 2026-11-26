import { PostgresCiclosAcademicos } from './postgres-ciclos-academicos';

test('CA-VS02 protege intentos activos de un postulante del ciclo aunque el simulacro no esté vinculado', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [{ cerradoEn: null }] })
    .mockResolvedValueOnce({ rows: [{ id: 'a' }] })
    .mockResolvedValueOnce({ rows: [{ id: 'p1' }] });
  const bd = { query };
  const cerrar = new PostgresCiclosAcademicos(bd);
  const activos = jest.fn().mockResolvedValue(true);
  await expect(cerrar.cerrar('c1', 'a', async () => false, activos)).rejects.toMatchObject({ name: 'ErrorConflicto' });
  expect(activos).toHaveBeenCalledWith(bd, ['p1']);
  expect(query).toHaveBeenCalledTimes(3);
});

test('CA-VS02 ni un cierre idempotente devuelve datos a un administrador revocado', async () => {
  const query = jest.fn()
    .mockResolvedValueOnce({ rows: [{ cerradoEn: new Date(0) }] })
    .mockResolvedValueOnce({ rows: [] });
  const cerrar = new PostgresCiclosAcademicos({ query });
  await expect(cerrar.cerrar('c1', 'a', async () => false, async () => false))
    .rejects.toMatchObject({ name: 'ErrorAccesoDenegado' });
  expect(query).toHaveBeenCalledTimes(2);
});
