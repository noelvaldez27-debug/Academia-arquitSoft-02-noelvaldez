export const especificacionOpenApi = {
  openapi: '3.0.0',
  info: {
    title: 'EVALUA-NET API',
    version: '0.1.0',
    description:
      'API REST del sistema de simulacros de exámenes virtuales EVALUA-NET — Academia Preuniversitaria Sofía',
  },
  paths: {
    '/health': {
      get: {
        summary: 'Verificar estado de salud del servidor',
        description: 'Retorna el estado de disponibilidad del backend y la marca de tiempo actual.',
        responses: {
          '200': {
            description: 'Servidor en funcionamiento correcto',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'ok',
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time',
                      example: '2026-11-19T22:30:00.000Z',
                    },
                  },
                  required: ['status', 'timestamp'],
                },
              },
            },
          },
        },
      },
    },
  },
};
