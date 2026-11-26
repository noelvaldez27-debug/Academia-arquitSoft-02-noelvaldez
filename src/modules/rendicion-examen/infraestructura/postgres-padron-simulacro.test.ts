import { PostgresPadronSimulacro } from './postgres-padron-simulacro';

test('CA-VS03 conserva un padrón consolidado y rechaza asociarlo a otro ciclo', async () => {
  const padron = { cicloId: 'c1', habilitadoEn: new Date(0) };
  const query = jest.fn().mockResolvedValue({ rows: [padron] });
  const repositorio = new PostgresPadronSimulacro({ query });
  await expect(repositorio.consolidar('s', 'c1', 'a', [])).resolves.toEqual(padron);
  await expect(repositorio.consolidar('s', 'c2', 'a', [])).rejects.toMatchObject({ codigo: 'conflicto' });
  expect(query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
});

test('CA-VS03 representa la ausencia de padrón sin consultar miembros', async () => {
  const query = jest.fn().mockResolvedValue({ rows: [] });
  const repositorio = new PostgresPadronSimulacro({ query });
  await expect(repositorio.listar('legado')).resolves.toBeNull();
  expect(query).toHaveBeenCalledTimes(1);
});
