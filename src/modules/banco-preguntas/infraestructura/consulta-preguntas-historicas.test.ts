import { crearConsultaNombresCursos, crearConsultaPreguntasHistoricas } from './postgres-version-simulacro';

test('CA-AE03 obtiene nombres de cursos en un lote para la recomendación', async () => {
  const rows = [{ id: 'c1', nombre: 'Álgebra' }];
  const query = jest.fn().mockResolvedValue({ rows });
  const consultar = crearConsultaNombresCursos({ query });
  expect(await consultar([])).toEqual([]);
  expect(await consultar(['c1', 'no-existe'])).toEqual(rows);
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith(expect.stringContaining('ANY($1::text[])'), [['c1', 'no-existe']]);
});

test('CA-AE05 distingue cambios de clave y solo entrega metadatos históricos', async () => {
  const pregunta = {
    id: 'p1', cursoId: 'c1', enunciado: 'Pregunta',
    alternativas: { A: 'Uno', B: 'Dos', C: 'Tres', D: 'Cuatro', E: 'Cinco' },
  };
  const query = jest.fn().mockResolvedValue({ rows: [
    { id: 's1', preguntas: [{ ...pregunta, correcta: 'A' }] },
    { id: 's2', preguntas: [{ ...pregunta, correcta: 'B' }] },
  ] });
  const consultar = crearConsultaPreguntasHistoricas({ query });
  expect(await consultar([])).toEqual([]);
  const [primera, segunda] = await consultar(['s1', 's2']);
  expect(query).toHaveBeenCalledTimes(1);
  expect(primera).toMatchObject({ simulacroId: 's1', preguntaId: 'p1', cursoId: 'c1' });
  expect(primera).not.toHaveProperty('correcta');
  expect(primera).not.toHaveProperty('alternativas');
  expect(primera.huellaInterna).not.toBe(segunda.huellaInterna);
});
