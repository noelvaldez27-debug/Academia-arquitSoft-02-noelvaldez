import { ConsultarEstadisticasUseCase } from './consultar-estadisticas.use-case';

function preparar() {
  const calificaciones = [
    { examenId: 'e1', simulacroId: 's1', sedeId: 'hana', correccion: 'incorrectas' },
    { examenId: 'e2', simulacroId: 's1', sedeId: 'urin', correccion: 'omitidas' },
    { examenId: 'e3', simulacroId: 's2', sedeId: null, correccion: 'correctas' },
    { examenId: 'e4', simulacroId: 's3', sedeId: 'hana', correccion: 'correctas' },
  ] as const;
  const resultados = jest.fn(async (simulacroId?: string, cursor?: string) => cursor ? [] :
    calificaciones.filter(fila => !simulacroId || fila.simulacroId === simulacroId).map(fila => ({
      examenId: fila.examenId, postulanteId: 'p' + fila.examenId, simulacroId: fila.simulacroId,
      correctas: 0, incorrectas: 0, omitidas: 0, puntajeCentesimos: 0, porCurso: [],
      detalle: [{ preguntaId: 'q1', cursoId: 'c1', correccion: fila.correccion }],
    })));
  const intentos = jest.fn(async (ids: string[]) => calificaciones.filter(fila => ids.includes(fila.examenId)).map(fila => ({
    id: fila.examenId, postulanteId: 'p' + fila.examenId, simulacroId: fila.simulacroId,
    cierre: new Date(0), sedeId: fila.sedeId,
  })));
  const preguntas = jest.fn(async (ids: string[]) => ids.map(id => ({
    simulacroId: id, preguntaId: 'q1', cursoId: 'c1', enunciado: 'Pregunta',
    huellaInterna: id === 's2' ? 'clave-distinta' : 'misma-version',
    tema: id === 's2' ? null : { id: 't1', nombre: id === 's1' ? 'Nombre anterior' : 'Nombre nuevo' },
  })));
  const casos = new ConsultarEstadisticasUseCase(resultados, intentos, preguntas,
    async id => id === 'docente' ? ['c1'] : []);
  return { casos, resultados, intentos, preguntas };
}

test('CA-AE05 agrupa por tema historico y version sin exponer clave o respuestas', async () => {
  const { casos, preguntas } = preparar();
  const resumen = await casos.ejecutar({ rol: 'general', id: 'admin' }, {});
  expect(resumen.intentosSinSedeHistorica).toBe(1);
  expect(resumen.porCurso).toEqual([{ cursoId: 'c1', total: 4, correctas: 2, incorrectas: 1, omitidas: 1,
    tasaAciertos: 50, tasaErrores: 25, tasaOmisiones: 25 }]);
  expect(resumen.porTema).toMatchObject([
    { temaId: 't1', nombresHistoricos: ['Nombre anterior', 'Nombre nuevo'], total: 3 },
    { temaId: null, total: 1 },
  ]);
  expect(resumen.porPregunta).toMatchObject([
    { preguntaId: 'q1', versionesSimulacro: ['s1', 's3'], total: 3, tasaErrores: 33.33 },
    { preguntaId: 'q1', versionesSimulacro: ['s2'], total: 1, tasaAciertos: 100 },
  ]);
  expect(resumen.porPregunta[0]).not.toHaveProperty('huellaInterna');
  expect(preguntas).toHaveBeenCalledTimes(1);
});

test('CA-AE05 restringe asignaciones docentes y sedes historicas y aplica filtros', async () => {
  const { casos, resultados } = preparar();
  const sede = { rol: 'sede', id: 'admin', sedeId: 'hana' } as const;
  await expect(casos.ejecutar(sede, { sedeId: 'urin' })).rejects.toMatchObject({ estado: 403 });
  await expect(casos.ejecutar({ rol: 'docente', id: 'docente' }, { cursoId: 'c2' })).rejects.toMatchObject({ estado: 403 });
  expect((await casos.ejecutar({ rol: 'docente', id: 'sin-cursos' }, {})).porCurso).toEqual([]);
  expect(resultados).not.toHaveBeenCalled();
  expect((await casos.ejecutar(sede, {})).porCurso[0].total).toBe(2);
  expect((await casos.ejecutar(sede, { simulacroId: 's1', temaId: 't1' })).porCurso[0].total).toBe(1);
  expect((await casos.ejecutar(sede, { temaId: 'sin-clasificar' })).porCurso).toEqual([]);
  expect((await casos.ejecutar({ rol: 'docente', id: 'docente' },
    { temaId: 'sin-clasificar' })).porTema[0]).toMatchObject({ temaId: null, total: 1 });
});
