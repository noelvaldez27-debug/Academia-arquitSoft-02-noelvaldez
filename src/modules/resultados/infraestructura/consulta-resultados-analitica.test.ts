import { PostgresResultadoRepository } from './postgres-resultado-repository';

test('CA-AE05 pagina resultados definitivos con y sin filtro por simulacro', async () => {
  const resultado = { examenId: 'e2', simulacroId: 's1' };
  const query = jest.fn().mockResolvedValue({ rows: [resultado] });
  const repositorio = new PostgresResultadoRepository({ query });
  expect(await repositorio.listarParaAnalitica(undefined, 'e1')).toEqual([resultado]);
  expect(await repositorio.listarParaAnalitica('s1', 'e1')).toEqual([resultado]);
  expect(query).toHaveBeenNthCalledWith(1,
    expect.stringContaining('examen_id > $1 ORDER BY examen_id LIMIT 100'), ['e1']);
  expect(query).toHaveBeenNthCalledWith(2,
    expect.stringContaining('simulacro_id = $1 AND examen_id > $2'), ['s1', 'e1']);
});
