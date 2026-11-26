const cadena = { type: 'string' };
const fecha = { ...cadena, format: 'date-time' };
const entero = { type: 'integer' };
const alternativa = { ...cadena, enum: ['A', 'B', 'C', 'D', 'E', null], nullable: true };
const respuesta = objeto({ numero: { ...entero, minimum: 1 }, alternativa, revision: { ...entero, minimum: 1 } });
const pregunta = objeto({
  id: cadena, cursoId: cadena, enunciado: cadena,
  alternativas: objeto({ A: cadena, B: cadena, C: cadena, D: cadena, E: cadena }),
});
const examen = objeto({
  id: cadena, simulacroId: cadena, inicio: fecha, vence: fecha,
  cierre: { ...fecha, nullable: true }, estado: { ...cadena, enum: ['ACTIVO', 'FINALIZADO'] },
  tiempoRestanteMs: { ...entero, minimum: 0 },
  preguntas: { type: 'array', items: pregunta }, respuestas: { type: 'array', items: respuesta },
});

function objeto(properties: Record<string, object>) {
  return { type: 'object', properties, required: Object.keys(properties) };
}

function json(schema: object) {
  return { 'application/json': { schema } };
}

function operacion(summary: string, schema: object, conId: boolean, entrada?: object) {
  return {
    summary,
    tags: ['Rendición de Examen'],
    security: [{ bearerAuth: [] }],
    ...(conId ? { parameters: [{ in: 'path', name: 'id', required: true, schema: cadena }] } : {}),
    ...(entrada ? { requestBody: { required: true, content: json(entrada) } } : {}),
    responses: {
      200: { description: 'Operación confirmada', content: json(schema) },
      400: { description: 'Entrada inválida' },
      401: { description: 'Sesión inválida o cuenta inactiva' },
      403: { description: 'La operación requiere el rol postulante' },
      404: { description: 'Simulacro o intento no disponible para el postulante' },
      409: { description: 'Plazo vencido, intento finalizado o conflicto de revisión' },
      503: { description: 'Infraestructura temporalmente no disponible' },
    },
  };
}

const base = '/api/v1/examenes';
export const rutasOpenApiRendicion = {
  [base + '/simulacros/{id}/habilitar']: {
    post: {
      ...operacion('Consolidar el padrón y habilitar el simulacro como administrador general', objeto({
        simulacroId: cadena, cicloId: { ...cadena, format: 'uuid' }, habilitadoEn: fecha,
      }), true, objeto({ cicloId: { ...cadena, format: 'uuid' } })),
      responses: {
        200: { description: 'Padrón consolidado o habilitación existente', content: json(objeto({
          simulacroId: cadena, cicloId: { ...cadena, format: 'uuid' }, habilitadoEn: fecha,
        })) },
        400: { description: 'Identificador inválido' },
        401: { description: 'Sesión inválida o ausente' },
        403: { description: 'Se requiere el administrador general' },
        404: { description: 'Simulacro o ciclo inexistente' },
        409: { description: 'Ciclo cerrado o simulacro incompatible con la habilitación' },
        503: { description: 'Infraestructura temporalmente no disponible' },
      },
    },
  },
  [base + '/simulacros/{id}/cierre']: {
    post: {
      ...operacion('Solicitar cierre general del simulacro', objeto({
        administradorId: cadena, solicitadoEn: fecha, cerradoEn: { ...fecha, nullable: true },
      }), true),
      responses: {
        200: { description: 'Cierre general completado' },
        202: { description: 'Cierre registrado, pendiente de intentos o calificaciones' },
        400: { description: 'Identificador inválido' },
        401: { description: 'Sesión inválida o cuenta inactiva' },
        403: { description: 'Se requiere el administrador general' },
        404: { description: 'Simulacro inexistente' },
        503: { description: 'Infraestructura temporalmente no disponible' },
      },
    },
  },
  [base + '/iniciar']: { post: operacion('Iniciar o recuperar un intento vigente', examen, false, objeto({ simulacroId: cadena })) },
  [base + '/{id}']: { get: operacion('Recuperar las respuestas confirmadas y el tiempo restante', examen, true) },
  [base + '/{id}/respuestas']: {
    put: operacion('Registrar, cambiar o borrar una marca por número de pregunta', respuesta, true, objeto({
      numero: { ...entero, minimum: 1 }, alternativa, revisionBase: { ...entero, minimum: 0 },
      operacionId: { ...cadena, pattern: '^[A-Za-z0-9_-]{1,80}$' },
    })),
  },
  [base + '/{id}/finalizar']: {
    post: operacion('Finalizar después de sincronizar todas las respuestas pendientes', objeto({
      id: cadena, cierre: fecha, estado: { ...cadena, enum: ['FINALIZADO'] },
    }), true),
  },
};
