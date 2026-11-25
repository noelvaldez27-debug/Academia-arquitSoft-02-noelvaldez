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
