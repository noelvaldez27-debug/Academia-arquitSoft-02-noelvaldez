import { ResultadoAcademico } from '../dominio/estadisticas';
import { ConsultarHistorialUseCase } from './consultar-historial.use-case';

test('CA-AE01 el historial vacio no consulta cierres', async () => {
  const intentos = jest.fn();
  const casos = new ConsultarHistorialUseCase(async () => [], intentos);
  expect(await casos.ejecutar('p1')).toEqual({ historial: [], porCurso: [], resultados: [] });
  expect(intentos).not.toHaveBeenCalled();
});

test('CA-AE01 y CA-AE02 conserva las notas y pondera preguntas de cada curso en orden cronologico', async () => {
  const a: ResultadoAcademico = {
    examenId: 'e1', simulacroId: 's1', postulanteId: 'p1', puntajeCentesimos: 0,
    correctas: 0, incorrectas: 1, omitidas: 1,
    porCurso: [{ cursoId: 'algebra', correctas: 0, incorrectas: 1, omitidas: 1 }],
  };
  const b: ResultadoAcademico = {
    examenId: 'e2', simulacroId: 's2', postulanteId: 'p1', puntajeCentesimos: 100000,
    correctas: 4, incorrectas: 0, omitidas: 0,
    porCurso: [
      { cursoId: 'algebra', correctas: 3, incorrectas: 0, omitidas: 0 },
      { cursoId: 'fisica', correctas: 1, incorrectas: 0, omitidas: 0 },
      { cursoId: 'sin-evaluar', correctas: 0, incorrectas: 0, omitidas: 0 },
    ],
  };
  const casos = new ConsultarHistorialUseCase(async (_, cursor) => !cursor ? [a, b] : [],
    async () => [a, b].map((fila, i) => ({
      id: fila.examenId, postulanteId: 'p1', simulacroId: fila.simulacroId, sedeId: null,
      cierre: new Date(i === 0 ? '2026-11-02' : '2026-11-01'),
    })));
  const { historial, porCurso } = await casos.ejecutar('p1');
  expect(historial.map(fila => fila.puntaje)).toEqual([1000, 0]);
  expect(porCurso).toEqual([
    { cursoId: 'algebra', correctas: 3, incorrectas: 1, omitidas: 1, total: 5, desempeno: 60 },
    { cursoId: 'fisica', correctas: 1, incorrectas: 0, omitidas: 0, total: 1, desempeno: 100 },
  ]);
});
