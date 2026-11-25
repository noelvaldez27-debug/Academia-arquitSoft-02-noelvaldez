const texto = { type: 'string' };
const conteo = { type: 'integer', minimum: 0 };
const totales = { correctas: conteo, incorrectas: conteo, omitidas: conteo };

function json(properties: Record<string, object>) {
  return { 'application/json': { schema: { type: 'object', required: Object.keys(properties), properties } } };
}

const curso = json({ cursoId: texto, ...totales })['application/json'].schema;

export const rutasOpenApiResultados = {
  '/api/v1/resultados/{id}': {
    get: {
      tags: ['Procesamiento de Resultados'],
      summary: 'Consultar la calificación propia por identificador del examen',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: texto }],
      responses: {
        200: { description: 'Calificación individual', content: json({
          estado: { ...texto, enum: ['PROCESADO'] }, examenId: texto, simulacroId: texto,
          puntaje: { type: 'number', minimum: 0, maximum: 1000, multipleOf: 0.01 },
          ...totales, porCurso: { type: 'array', items: curso },
        }) },
        202: { description: 'Calificación pendiente', headers: { 'Retry-After': { schema: { type: 'integer' } } },
          content: json({ estado: { ...texto, enum: ['PENDIENTE'] }, examenId: texto }) },
        401: { description: 'Sesión inválida o cuenta inactiva' },
        403: { description: 'La consulta requiere el rol postulante' },
        404: { description: 'Examen sin cierre, ajeno o inexistente' },
        503: { description: 'Consulta temporalmente no disponible' },
      },
    },
  },
};
