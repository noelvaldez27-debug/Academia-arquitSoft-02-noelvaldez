const texto = { type: 'string' };
const alternativas = {
  type: 'object',
  required: ['A', 'B', 'C', 'D', 'E'],
  additionalProperties: false,
  properties: { A: texto, B: texto, C: texto, D: texto, E: texto },
};
const contenidoPregunta = {
  type: 'object',
  required: ['enunciado', 'alternativas', 'correcta'],
  properties: { enunciado: texto, alternativas, correcta: { ...texto, enum: alternativas.required } },
};

export function operacionBanco(
  summary: string, codigo: number, parametros: string[] = [], body?: object, respuesta?: object,
) {
  return {
    tags: ['Banco de Preguntas'],
    summary,
    security: [{ bearerAuth: [] }],
    parameters: parametros.map(name => ({ name, in: 'path', required: true, schema: texto })),
    ...(body && { requestBody: { required: true, content: { 'application/json': { schema: body } } } }),
    responses: {
      [codigo]: {
        description: 'Operación completada',
        ...(respuesta && { content: { 'application/json': { schema: respuesta } } }),
      },
      400: { description: 'Solicitud inválida' },
      401: { description: 'Sesión inválida o ausente' },
      403: { description: 'Permiso insuficiente' },
      404: { description: 'Recurso no encontrado' },
      409: { description: 'Conflicto con el estado actual' },
      500: { description: 'Error interno' },
    },
  };
}

const curso = { type: 'object', required: ['nombre'], properties: { nombre: texto } };
const pregunta = {
  ...contenidoPregunta,
  properties: { ...contenidoPregunta.properties, id: texto, cursoId: texto,
    habilitada: { type: 'boolean' }, propuestaId: { ...texto, nullable: true } },
};
const autorizacion = {
  type: 'object',
  required: ['estado'],
  properties: {
    estado: { ...texto, enum: ['AUTORIZADA', 'REVOCADA'] },
    alcance: { type: 'array', items: { ...texto, enum: ['texto', 'adjunto'] } },
    contenidoApto: { type: 'boolean', description: 'El administrador verificó permisos y ausencia de datos personales, credenciales y contenido confidencial.' },
  },
};
export const rutasOpenApiBanco = {
  '/api/banco-preguntas/separatas/{id}/archivo': {
    get: operacionBanco('Descargar el original para verificar permisos y contenido', 200, ['id']),
  },
  '/api/banco-preguntas/separatas/{id}': {
    get: operacionBanco('Consultar estado, motivo, autorización y propuestas de la separata', 200, ['id']),
  },
  '/api/banco-preguntas/separatas/{id}/autorizacion': {
    put: operacionBanco('Autorizar o revocar la transferencia al proveedor externo', 200, ['id'], autorizacion),
  },
  '/api/banco-preguntas/propuestas/{id}': {
    put: operacionBanco('Corregir propuesta y requerir una nueva validación docente', 200, ['id'], contenidoPregunta),
  },
  '/api/banco-preguntas/propuestas/{id}/aprobar': {
    post: operacionBanco('Aprobar propuesta como docente responsable', 200, ['id']),
  },
  '/api/banco-preguntas/propuestas/{id}/descartar': {
    post: operacionBanco('Descartar propuesta', 200, ['id']),
  },
  '/api/banco-preguntas/cursos/{cursoId}/separatas': {
    post: {
      ...operacionBanco('Subir separata (DOCX, PDF, JPG, JPEG o PNG)', 202, ['cursoId'], undefined, {
        type: 'object', properties: { id: texto, estado: texto },
      }),
      requestBody: { required: true, content: { 'multipart/form-data': { schema: {
        type: 'object', required: ['archivo'], properties: { archivo: { type: 'string', format: 'binary' } },
      } } } },
    },
  },
  '/api/banco-preguntas/cursos': {
    post: operacionBanco('Crear curso', 201, [], curso, { ...curso, properties: { ...curso.properties, id: texto } }),
  },
  '/api/banco-preguntas/cursos/{cursoId}/preguntas': {
    get: operacionBanco('Listar preguntas del curso', 200, ['cursoId'], undefined, { type: 'array', items: pregunta }),
    post: operacionBanco('Crear pregunta manual', 201, ['cursoId'], contenidoPregunta, pregunta),
  },
  '/api/banco-preguntas/preguntas/{id}': {
    put: operacionBanco('Editar pregunta manual', 200, ['id'], {
      ...contenidoPregunta,
      properties: { ...contenidoPregunta.properties, habilitada: { type: 'boolean' } },
    }, pregunta),
  },
};
