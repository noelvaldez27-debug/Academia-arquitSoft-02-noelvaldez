import { PostgresVersionSimulacro } from './postgres-version-simulacro';

it('CA-PR01 lee exclusivamente la versión congelada y conserva el orden y curso', async () => {
  const query = jest.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{
    preguntas: [
      { id: 'p2', cursoId: 'c1', correcta: 'E', enunciado: 'Dos' },
      { id: 'p1', cursoId: 'c2', correcta: 'A', enunciado: 'Uno' },
    ],
  }] });
  const versiones = new PostgresVersionSimulacro({ query });
  await expect(versiones.claveCongelada('s')).resolves.toBeNull();
  await expect(versiones.claveCongelada('s')).resolves.toEqual([
    { preguntaId: 'p2', cursoId: 'c1', correcta: 'E' },
    { preguntaId: 'p1', cursoId: 'c2', correcta: 'A' },
  ]);
  expect(query).toHaveBeenCalledTimes(2);
  expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM versiones_simulacro'), ['s']);
});
