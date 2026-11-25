const texto = { type: 'string' };
const entero = { type: 'integer', minimum: 0 };
const fecha = { ...texto, format: 'date-time' };
const conteos = { correctas: entero, incorrectas: entero, omitidas: entero };
const tasa = { type: 'number', minimum: 0, maximum: 100, multipleOf: 0.01 };
const indicadores = { ...conteos, total: entero, tasaAciertos: tasa, tasaErrores: tasa, tasaOmisiones: tasa };
const listaTexto = { type: 'array', items: texto };

export const esquemaCursos = {
  type: 'object',
  properties: { cursoId: texto, ...conteos, total: entero, desempeno: tasa },
};

export function operacionAnalitica(summary: string, schema: object) {
  return {
    summary,
    tags: ['Analitica del Estudiante'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'Consulta completada', content: { 'application/json': { schema } } },
      400: { description: 'Parametros invalidos' },
      401: { description: 'Sesion invalida o ausente' },
      403: { description: 'Permiso insuficiente' },
      500: { description: 'Error interno' },
    },
  };
}

export const rutasOpenApiAnalitica = {
  '/api/v1/analitica/estadisticas': {
    get: {
      ...operacionAnalitica('Consultar exposiciones evaluadas por curso, tema y versión histórica de pregunta', {
        type: 'object',
        properties: {
          intentosSinSedeHistorica: entero,
          porCurso: lista({ cursoId: texto, ...indicadores }),
          porTema: lista({ cursoId: texto, temaId: { ...texto, nullable: true },
            nombresHistoricos: listaTexto, ...indicadores }),
          porPregunta: lista({ cursoId: texto, preguntaId: texto, enunciado: { ...texto, nullable: true },
            versionesSimulacro: listaTexto, ...indicadores }),
        },
      }),
      parameters: ['simulacroId', 'cursoId', 'temaId', 'sedeId'].map(name => ({
        name, in: 'query', schema: texto, ...(name === 'temaId' && { description: 'Usa sin-clasificar para temas desconocidos.' }),
      })),
    },
  },
  '/api/v1/analitica/mi-historial': {
    get: operacionAnalitica('Consultar historial y desempeno propios', {
      type: 'object',
      properties: {
        historial: { type: 'array', items: { type: 'object', properties: {
          simulacroId: texto, fecha, puntaje: { type: 'number', minimum: 0, maximum: 1000 }, ...conteos,
        } } },
        porCurso: { type: 'array', items: esquemaCursos },
      },
    }),
  },
  '/api/v1/analitica/mi-recomendacion': {
    post: operacionAnalitica('Obtener o generar la recomendacion propia', {
      type: 'object',
      properties: {
        estado: { ...texto, enum: ['vigente', 'sin_prioridades', 'evidencia_insuficiente'] },
        origen: { ...texto, enum: ['ia', 'local'] },
        cursos: { type: 'array', items: texto },
        contenido: texto, generadaEn: fecha, versionReglas: entero,
      },
    }),
  },
};

function lista(properties: object) {
  return { type: 'array', items: { type: 'object', properties } };
}
