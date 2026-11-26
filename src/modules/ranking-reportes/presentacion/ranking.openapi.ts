const texto = { type: 'string' };
export const parametroSimulacro = { name: 'simulacroId', in: 'path', required: true, schema: texto };
export const parametrosAmbito = ['carrera', 'sedeId'].map(name => ({ name, in: 'query', schema: texto }));
export const rutaRanking = '/api/v1/rankings/{simulacroId}';

export function operacionRanking(summary: string, parameters: object[], content?: object) {
  return {
    summary, tags: ['Ranking y Reportes'], security: [{ bearerAuth: [] }], parameters,
    responses: {
      200: { description: 'Consulta disponible', ...(content ? { content } : {}) },
      400: { description: 'Filtro inválido' }, 401: { description: 'Autenticación requerida' },
      403: { description: 'Ámbito o rol sin autorización' }, 404: { description: 'Datos no disponibles' },
      503: { description: 'Consulta temporalmente no disponible' },
    },
  };
}

export function jsonRanking(properties: Record<string, object>) {
  return { 'application/json': { schema: { type: 'object', properties } } };
}

const booleano = { type: 'boolean' };
const entero = { type: 'integer' };
const nota = { type: 'number', minimum: 0, maximum: 1000 };
const resumen = { type: 'object', properties: { puesto: { ...entero, nullable: true }, participantes: entero } };

export const rutasOpenApiRanking = {
  [rutaRanking + '/reportes/{tipo}']: { get: operacionRanking(
    'Consultar o exportar participación, resultados y cuadro de méritos como administrador',
    [parametroSimulacro, { in: 'path', name: 'tipo', required: true,
      schema: { ...texto, enum: ['participacion', 'resultados', 'meritos'] } }, ...parametrosAmbito,
    { in: 'query', name: 'condicion', schema: { ...texto, enum: ['MATRICULADO', 'LIBRE', 'NO_DETERMINADA'] } },
    ...['desde', 'hasta'].map(name => ({ in: 'query', name, schema: { ...texto, format: 'date-time' },
      description: 'Límite inclusivo de la fecha de inicio del intento.' })),
    { in: 'query', name: 'formato', schema: { ...texto, enum: ['xlsx'] } }],
    {
      ...jsonRanking({ simulacroId: texto, estado: { ...texto, enum: ['PROVISIONAL', 'DEFINITIVO'] },
        resumen: { type: 'object', properties: {
          inscritos: { ...entero, nullable: true, description: 'Población habilitada en el padrón histórico o null cuando no existe.' },
          noParticipantes: { ...entero, nullable: true },
          porcentajeParticipacion: { type: 'number', nullable: true, minimum: 0, maximum: 100,
            description: 'Null para un padrón desconocido o con cero inscritos.' },
          participantes: entero, enCurso: entero, finalizados: entero, calificados: entero,
        } },
        filas: { type: 'array', items: { type: 'object', properties: {
          simulacroId: texto, postulanteId: texto, carrera: { ...texto, nullable: true }, sedeId: { ...texto, nullable: true },
          condicion: texto, puntaje: nota, correctas: entero, incorrectas: entero, omitidas: entero, puesto: entero, estado: texto,
        } } },
      }),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { ...texto, format: 'binary' } },
    },
  ) },
  [rutaRanking + '/reportes/cursos/{cursoId}']: { get: operacionRanking('Consultar agregados de un curso asignado',
    [parametroSimulacro, { in: 'path', name: 'cursoId', required: true, schema: texto }],
    jsonRanking({ simulacroId: texto, cursoId: texto, definitiva: booleano,
      resumen: { type: 'object', properties: { calificados: entero, correctas: entero, incorrectas: entero, omitidas: entero } },
    })) },
  [rutaRanking + '/propio']: { get: operacionRanking('Consultar puesto y puntaje propios', [parametroSimulacro], jsonRanking({
    simulacroId: texto, definitiva: booleano, puntaje: { ...nota, nullable: true },
    general: resumen, carrera: { ...resumen, nullable: true }, sede: { ...resumen, nullable: true },
  })) },
  [rutaRanking]: { get: operacionRanking('Consultar ranking administrativo en un ámbito autorizado',
    [parametroSimulacro, ...parametrosAmbito], jsonRanking({
      simulacroId: texto, ambito: { type: 'object', properties: { carrera: texto, sedeId: texto } },
      definitiva: booleano, participantes: entero, filas: { type: 'array', items: {
        type: 'object', properties: { postulanteId: texto, puesto: entero, puntaje: nota },
      } },
    })) },
};
