const esquemaDetallesCarga = {
  type: 'array',
  items: {
    type: 'object',
    required: ['fila', 'motivo'],
    properties: { fila: { type: 'integer' }, motivo: { type: 'string' } },
  },
};
const datosCiclo = {
  nombre: { type: 'string', maxLength: 120 },
  iniciaEl: { type: 'string', format: 'date' },
  terminaEl: { type: 'string', format: 'date' },
};
const esquemaCiclo = { type: 'object', properties: {
  id: { type: 'string', format: 'uuid' }, ...datosCiclo, cerradoEn: { type: 'string', format: 'date-time', nullable: true },
} };
function descargaCredenciales(formato: 'uuid' | 'id') {
  return {
    post: {
      tags: ['Usuarios'],
      summary: 'Consumir entrega temporal de credenciales del administrador emisor',
      security: [{ bearerAuth: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string',
        ...(formato === 'uuid' && { format: formato }) } }],
      responses: {
        200: { description: 'Excel de un solo uso', content: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } },
        } },
        400: { description: 'Identificador inválido' },
        401: { description: 'Sesión inválida o ausente' },
        403: { description: 'Se requiere administrador autorizado' },
        404: { description: 'Entrega vencida, consumida o ajena' },
        503: { description: 'Entrega temporalmente no disponible' },
      },
    },
  };
}
export const especificacionOpenApi = {
  openapi: '3.0.0',
  info: {
    title: 'EVALUA-NET API',
    version: '0.1.0',
    description:
      'API REST del sistema de simulacros de exámenes virtuales EVALUA-NET — Academia Preuniversitaria Sofía',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/api/usuarios/ciclos/{id}/cierre': {
      post: {
        summary: 'Cerrar ciclo, desactivar sus cuentas y conservar historial',
        tags: ['Usuarios'], security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Cierre nuevo o existente', content: { 'application/json': { schema: {
            type: 'object', properties: { id: { type: 'string', format: 'uuid' }, cerradoEn: { type: 'string', format: 'date-time' } },
          } } } },
          400: { description: 'Identificador inválido' },
          401: { description: 'Sesión inválida o ausente' },
          403: { description: 'Se requiere administrador general' },
          404: { description: 'Ciclo inexistente' },
          409: { description: 'Simulacros sin cierre o intentos activos' },
          503: { description: 'Cierre temporalmente no disponible' },
        },
      },
    },
    '/api/usuarios/ciclos': {
      get: {
        summary: 'Consultar ciclos abiertos e históricos',
        tags: ['Usuarios'], security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Ciclos', content: { 'application/json': { schema: { type: 'array', items: esquemaCiclo } } } },
          401: { description: 'Sesión inválida o ausente' },
          403: { description: 'Rol no permitido' },
          503: { description: 'Ciclos temporalmente no disponibles' },
        },
      },
      post: {
        summary: 'Crear ciclo como administrador general',
        tags: ['Usuarios'], security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['nombre', 'iniciaEl', 'terminaEl'], properties: datosCiclo,
        } } } },
        responses: {
          201: { description: 'Ciclo creado', content: { 'application/json': { schema: esquemaCiclo } } },
          400: { description: 'Nombre o fechas inválidos' },
          401: { description: 'Sesión inválida o ausente' },
          403: { description: 'Se requiere administrador general' },
          503: { description: 'Ciclos temporalmente no disponibles' },
        },
      },
    },
    '/api/usuarios/estudiantes/archivar': {
      post: {
        tags: ['Usuarios'],
        summary: 'Archivar postulantes de forma atómica dentro del alcance autorizado',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['ids'], properties: { ids: {
            type: 'array', minItems: 1, maxItems: 1000, items: { type: 'string', pattern: '^[1-9][0-9]{0,9}$' },
          } },
        } } } },
        responses: {
          200: { description: 'Cantidad de cuentas que cambiaron de estado', content: { 'application/json': { schema: {
            type: 'object', required: ['archivados'], properties: { archivados: { type: 'integer', minimum: 0 } },
          } } } },
          400: { description: 'Identificadores inválidos' },
          401: { description: 'Sesión inválida o ausente' },
          403: { description: 'Fuera del rol o ámbito autorizado' },
          404: { description: 'Uno o más postulantes no existen' },
          409: { description: 'Existen intentos activos' },
          503: { description: 'Archivado temporalmente no disponible' },
        },
      },
    },
    '/api/usuarios/estudiantes/{id}/credenciales': descargaCredenciales('id'),
    '/api/usuarios/estudiantes/{id}/password/restablecer': {
      post: {
        tags: ['Usuarios'], summary: 'Restablecer la contraseña temporal de un estudiante',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^\\d+$' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['identidadVerificada'],
          properties: { identidadVerificada: { type: 'boolean', enum: [true], description: 'Confirma la verificación de identidad previa.' } } } } } },
        responses: {
          200: { description: 'Contraseña temporal de un solo uso; respuesta no almacenable', headers: { 'Cache-Control': { schema: { type: 'string', example: 'private, no-store' } } }, content: { 'application/json': { schema: { type: 'object', required: ['passwordTemporal', 'venceEn'], properties: { passwordTemporal: { type: 'string' }, venceEn: { type: 'string', format: 'date-time' } } } } } },
          400: { description: 'Falta confirmar la verificación de identidad o el identificador es inválido' },
          401: { description: 'Sesión inválida o ausente' },
          403: { description: 'Administrador o alcance de sede no autorizado' },
          500: { description: 'Error interno del servidor' },
        },
      },
    },
    '/api/usuarios/cargas-masivas/{id}/credenciales': descargaCredenciales('uuid'),
    '/api/usuarios/cargas-masivas': {
      get: {
        tags: ['Usuarios'],
        summary: 'Consultar el historial paginado de cargas en el alcance administrativo',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'pagina', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 } },
          { name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': { description: 'Página de cargas', content: { 'application/json': { schema: {
            type: 'object', required: ['cargas', 'pagina', 'hayMas'],
            properties: {
              pagina: { type: 'integer' }, hayMas: { type: 'boolean' },
              cargas: { type: 'array', items: { type: 'object', required: ['id', 'estado', 'creadaEl', 'propia'],
                properties: {
                  id: { type: 'string', format: 'uuid' }, estado: { type: 'string' },
                  creadaEl: { type: 'string', format: 'date-time' }, propia: { type: 'boolean' },
                  cicloNombre: { type: 'string', nullable: true },
                } } },
            },
          } } } },
          '400': { description: 'Paginación inválida' },
          '401': { description: 'Sesión inválida o ausente' },
          '403': { description: 'Acceso denegado' },
          '500': { description: 'No se pudo consultar el historial' },
        },
      },
      post: {
        tags: ['Usuarios'],
        summary: 'Aceptar un Excel para registro masivo en segundo plano',
        description: 'Requiere un ciclo académico abierto de destino. Clasifica cada DNI como alta, recuperación elegible, vínculo, existente en el ciclo o rechazo. Busca encabezados equivalentes en las primeras 20 filas; omite filas vacías y columnas adicionales. El administrador general requiere sede; el administrador de sede puede omitirla y se usa su sede autenticada. El DNI debe representar exactamente ocho dígitos.',
        parameters: [{ name: 'cicloId', in: 'query', required: true, schema: { type: 'string', format: 'uuid' },
          description: 'Ciclo académico abierto de destino.' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: {
            type: 'object', required: ['archivo'],
            properties: { archivo: { type: 'string', format: 'binary' } },
          } } },
        },
        responses: {
          '202': {
            description: 'Carga aceptada',
            headers: { Location: { schema: { type: 'string' }, description: 'Ruta de consulta del resultado' } },
            content: { 'application/json': { schema: {
              type: 'object', required: ['id'],
              properties: { id: { type: 'string', format: 'uuid' } },
            } } },
          },
          '400': { description: 'Archivo XLSX inválido, encabezados faltantes/ambiguos o archivo fuera de los límites', content: { 'application/json': { schema: { type: 'object', required: ['error'], properties: { error: { type: 'string', description: 'Mensaje seguro de validación' } } } } } },
          '401': { description: 'Sesión inválida o ausente' },
          '403': { description: 'Se requiere rol de administrador' },
          '404': { description: 'Ciclo no encontrado' },
          '409': { description: 'Ciclo cerrado' },
          '500': { description: 'No se pudo aceptar la carga' },
        },
      },
    },
    '/api/usuarios/cargas-masivas/{id}': {
      get: {
        tags: ['Usuarios'],
        summary: 'Consultar estado, totales, rechazos y avisos de una carga',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Estado y resultado',
            content: { 'application/json': { schema: {
              type: 'object',
              required: ['id', 'estado', 'totalFilas', 'creadas', 'yaExistian', 'rechazadas', 'errores', 'avisos'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                estado: { type: 'string', enum: ['PENDIENTE', 'PROCESANDO', 'COMPLETADA', 'FALLIDA'] },
                totalFilas: { type: 'integer' },
                creadas: { type: 'integer' },
                recuperadas: { type: 'integer' },
                vinculadas: { type: 'integer' },
                cicloId: { type: 'string', format: 'uuid' },
                cicloNombre: { type: 'string', nullable: true },
                yaExistian: { type: 'integer' },
                rechazadas: { type: 'integer' },
                errores: esquemaDetallesCarga,
                avisos: esquemaDetallesCarga,
              },
            } } },
          },
          '400': { description: 'Identificador inválido' },
          '401': { description: 'Sesión inválida o ausente' },
          '403': { description: 'Rol no permitido o carga fuera del alcance de la sede' },
          '404': { description: 'Carga no encontrada' },
          '500': { description: 'No se pudo consultar la carga' },
        },
      },
    },
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
    '/api/usuarios/login': {
      post: {
        summary: 'Iniciar sesión de usuario',
        description:
          'Autentica las credenciales (correo y contraseña) de un usuario activo y retorna un token JWT que incluye su identificador, rol y sede.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['correo', 'password'],
                properties: {
                  correo: {
                    type: 'string',
                    format: 'email',
                    example: 'admin.general@sofia.edu',
                  },
                  password: {
                    type: 'string',
                    example: 'clave_segura_123',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Inicio de sesión exitoso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    cambioPasswordRequerido: { type: 'boolean',
                      description: 'El token provisional solo habilita PATCH /api/usuarios/password.' },
                    usuario: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        nombre: { type: 'string' },
                        correo: { type: 'string' },
                        rol: { type: 'string' },
                        sedeId: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Credenciales inválidas o cuenta no activa',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', example: 'Credenciales invalidas.' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/usuarios/estudiantes/{id}/condicion': {
      patch: {
        tags: ['Usuarios'],
        summary: 'Actualizar la condición académica de un postulante',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['condicion'],
            properties: { condicion: { type: 'string', enum: ['MATRICULADO', 'LIBRE'] } },
          } } },
        },
        responses: {
          '204': { description: 'Condición actualizada' },
          '400': { description: 'Identificador o condición inválida' },
          '401': { description: 'Autenticación requerida' },
          '403': { description: 'Se requiere un administrador autorizado' },
          '404': { description: 'Postulante no encontrado en el ámbito autorizado' },
        },
      },
    },
    '/api/usuarios/estudiantes': {
      post: {
        summary: 'Registrar estudiante (postulante)',
        description:
          'Registra o clasifica un postulante dentro de un ciclo abierto. Requiere rol Administrador (general o de sede propia). Una nueva cuenta o recuperación elegible emite credenciales provisionales; el vínculo de una cuenta activa conserva sus credenciales.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'dni', 'sedeId', 'carrera', 'cicloId'],
                properties: {
                  nombre: { type: 'string', example: 'Juan Alumno' },
                  dni: { type: 'string', example: '71234567' },
                  sedeId: { type: 'string', example: 'Hana' },
                  carrera: { type: 'string', example: 'Medicina Humana' },
                  cicloId: { type: 'string', format: 'uuid',
                    description: 'Ciclo académico abierto donde se vinculará o registrará al estudiante.' },
                  condicion: { type: 'string', enum: ['MATRICULADO', 'LIBRE'] },
                },
              },
            },
          },
        },
        responses: {
          '500': { description: 'Error interno del servidor' },
          '201': {
            description: 'Estudiante registrado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    cicloResultado: { type: 'string', enum: ['creada', 'recuperada', 'vinculada', 'existente'] },
                    credencialesDisponibles: { type: 'boolean' },
                    nombre: { type: 'string' },
                    dni: { type: 'string' },
                    correo: { type: 'string' },
                    rol: { type: 'string', example: 'POSTULANTE' },
                    sedeId: { type: 'string' },
                    carrera: { type: 'string' },
                    condicion: { type: 'string', enum: ['MATRICULADO', 'LIBRE'] },
                    activo: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': { description: 'Campos requeridos, formato DNI, sede o ciclo abierto inválidos' },
          '401': {
            description: 'Acceso no autorizado (token no proporcionado o expirado)',
          },
          '403': {
            description: 'Acceso denegado (rol sin permisos o administrador de otra sede)',
          },
          '409': { description: 'Conflicto de identidad, DNI o ciclo académico' },
        },
      },
    },
    '/api/usuarios/docentes': {
      post: {
        summary: 'Registrar docente',
        description:
          'Registra un docente con nombre y DNI. Requiere rol Administrador General. Genera credenciales automáticas con formato dni@sofia.edu y hash de contraseña.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'dni'],
                properties: {
                  nombre: { type: 'string', example: 'Profesor Ricardo Palma' },
                  dni: { type: 'string', example: '10203040' },
                },
              },
            },
          },
        },
        responses: {
          '500': { description: 'Error interno del servidor' },
          '201': {
            description: 'Docente registrado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    nombre: { type: 'string' },
                    dni: { type: 'string' },
                    correo: { type: 'string' },
                    rol: { type: 'string', example: 'DOCENTE' },
                    activo: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Error de validación (nombre vacío o DNI inválido)',
          },
          '401': {
            description: 'Acceso no autorizado (token ausente o expirado)',
          },
          '403': {
            description: 'Acceso denegado (requiere Administrador General)',
          },
          '409': {
            description: 'Conflicto: el DNI ya se encuentra registrado',
          },
        },
      },
    },
    '/api/usuarios/password': {
      patch: {
        summary: 'Cambiar la propia contraseña',
        description:
          'Permite a cualquier usuario autenticado actualizar su contraseña proporcionando su contraseña actual y una nueva contraseña de mínimo 8 caracteres. Ninguna contraseña ni hash es retornado.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['passwordActual', 'passwordNueva'],
                properties: {
                  passwordActual: { type: 'string', example: 'mi_clave_actual' },
                  passwordNueva: { type: 'string', example: 'nueva_clave_segura_123' },
                },
              },
            },
          },
        },
        responses: {
          '500': { description: 'Error interno del servidor' },
          '200': {
            description: 'Contraseña actualizada exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Contrasena actualizada con exito.' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Error de validación (contraseña actual vacía o nueva menor a 8 caracteres)',
          },
          '401': {
            description: 'Acceso no autorizado o credenciales inválidas (contraseña actual incorrecta)',
          },
        },
      },
    },
    '/api/usuarios/correo': {
      patch: {
        summary: 'Cambiar el propio correo del administrador',
        description:
          'Permite a un administrador (general o de sede) actualizar su correo proporcionando el nuevo correo y su contraseña actual. El correo no puede estar en uso por otro usuario.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nuevoCorreo', 'passwordActual'],
                properties: {
                  nuevoCorreo: { type: 'string', format: 'email', example: 'nuevo.admin@sofia.edu' },
                  passwordActual: { type: 'string', example: 'mi_clave_actual' },
                },
              },
            },
          },
        },
        responses: {
          '500': { description: 'Error interno del servidor' },
          '200': {
            description: 'Correo actualizado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Correo actualizado con exito.' },
                  },
                },
              },
            },
          },
          '400': { description: 'Error de validación (correo inválido o contraseña vacía)' },
          '401': { description: 'Acceso no autorizado o contraseña actual incorrecta' },
          '403': { description: 'Acceso denegado (solo administradores)' },
          '409': { description: 'El correo ya está en uso por otro usuario' },
        },
      },
    },
    '/api/usuarios': {
      get: {
        summary: 'Listar usuarios paginados con filtros',
        description:
          'Permite consultar el listado de usuarios paginado. El administrador general puede consultar todos los usuarios de cualquier rol o sede. El administrador de sede solo puede consultar postulantes de su sede. Postulantes y docentes tienen acceso denegado. Nunca expone contraseñas ni hashes.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 160 },
            description: 'Coincidencia literal parcial en nombre, DNI o correo dentro del alcance autorizado, antes de paginar.' },
          { name: 'archivados', in: 'query', schema: { type: 'boolean', default: false },
            description: 'true consulta solo postulantes archivados dentro del alcance autorizado.' },
          {
            name: 'rol',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['POSTULANTE', 'DOCENTE', 'ADMINISTRADOR'] },
            description: 'Filtrar por rol de usuario',
          },
          {
            name: 'sedeId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filtrar por identificador de sede',
          },
          {
            name: 'pagina',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1, minimum: 1 },
            description: 'Número de página',
          },
          {
            name: 'limite',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
            description: 'Cantidad de elementos por página (máximo 100)',
          },
        ],
        responses: {
          '500': { description: 'Error interno del servidor' },
          '200': {
            description: 'Listado de usuarios obtenido exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    usuarios: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          nombre: { type: 'string' },
                          dni: { type: 'string', nullable: true },
                          correo: { type: 'string' },
                          rol: { type: 'string' },
                          activo: { type: 'boolean' },
                          sedeId: { type: 'string', nullable: true },
                          carrera: { type: 'string', nullable: true },
                        },
                      },
                    },
                    total: { type: 'integer' },
                    pagina: { type: 'integer' },
                    limite: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { description: 'Acceso no autorizado' },
          '403': {
            description:
              'Acceso denegado (solo administradores, o admin de sede intentando ver otra sede o rol distinto de postulante)',
          },
        },
      },
    },
    '/api/usuarios/{id}/desactivar': {
      patch: {
        summary: 'Desactivar usuario sin borrarlo',
        description:
          'Desactiva la cuenta de un usuario. Un usuario inactivo pierde el acceso inmediatamente. Nadie puede desactivarse a sí mismo ni desactivar al administrador general. El administrador de sede solo puede desactivar postulantes de su sede.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Identificador del usuario a desactivar',
          },
        ],
        responses: {
          '500': { description: 'Error interno del servidor' },
          '200': {
            description: 'Usuario desactivado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Usuario desactivado con exito.' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Solicitud inválida (intento de desactivarse a sí mismo o al administrador general)',
          },
          '401': { description: 'Acceso no autorizado' },
          '403': {
            description:
              'Acceso denegado (no administrador, o administrador de sede intentando modificar a un usuario de otra sede o rol distinto a postulante)',
          },
          '404': { description: 'Usuario no encontrado' },
        },
      },
    },
    '/api/usuarios/{id}/reactivar': {
      patch: {
        summary: 'Reactivar usuario inactivo',
        description:
          'Reactiva cuentas inactivas anteriores al archivado auditado. Los postulantes archivados se recuperan por DNI al registrar un nuevo ciclo.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Identificador del usuario a reactivar',
          },
        ],
        responses: {
          '500': { description: 'Error interno del servidor' },
          '200': {
            description: 'Usuario reactivado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    mensaje: { type: 'string', example: 'Usuario reactivado con exito.' },
                  },
                },
              },
            },
          },
          '401': { description: 'Acceso no autorizado' },
          '403': {
            description:
              'Acceso denegado (no administrador, o administrador de sede intentando modificar a un usuario de otra sede o rol distinto a postulante)',
          },
          '404': { description: 'Usuario no encontrado' },
          '409': { description: 'El postulante debe recuperarse en un ciclo' },
        },
      },
    },
    '/api/usuarios/administradores-sede': {
      post: {
        summary: 'Crear cuenta de administrador de sede',
        description:
          'Permite al administrador general registrar una cuenta de administrador de sede con nombre, correo, contraseña inicial y sede especificada. No utiliza la regla del DNI. No se puede crear otro administrador general.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'correo', 'passwordInicial', 'sedeId'],
                properties: {
                  nombre: { type: 'string', example: 'Admin Hana' },
                  correo: { type: 'string', format: 'email', example: 'admin.hana@sofia.edu' },
                  passwordInicial: { type: 'string', minLength: 8, example: 'clave_admin_123' },
                  sedeId: { type: 'string', example: '1' },
                },
              },
            },
          },
        },
        responses: {
          '500': { description: 'Error interno del servidor' },
          '201': {
            description: 'Administrador de sede creado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    nombre: { type: 'string' },
                    correo: { type: 'string' },
                    rol: { type: 'string', example: 'ADMINISTRADOR' },
                    alcanceAdministrador: { type: 'string', example: 'SEDE' },
                    sedeId: { type: 'string' },
                    activo: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': { description: 'Error de validación (datos incompletos, formato de correo inválido o contraseña < 8 caracteres)' },
          '401': { description: 'Acceso no autorizado' },
          '403': { description: 'Acceso denegado (solo el administrador general puede crear administradores de sede)' },
          '409': { description: 'El correo ya está en uso por otro usuario' },
        },
      },
    },
    '/api/usuarios/sedes': {
      get: {
        summary: 'Listar sedes existentes',
        description: 'Permite a cualquier administrador autenticado (general o de sede) consultar la lista de sedes existentes.',
        security: [{ bearerAuth: [] }],
        responses: {
          '500': { description: 'Error interno del servidor' },
          '200': {
            description: 'Lista de sedes obtenida exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: '1' },
                      nombre: { type: 'string', example: 'Hana' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Acceso no autorizado' },
          '403': { description: 'Acceso denegado (solo administradores)' },
        },
      },
      post: {
        summary: 'Crear una sede nueva',
        description:
          'Permite al administrador general registrar una nueva sede sin cambiar código. La nueva sede queda disponible para registrar estudiantes.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre'],
                properties: {
                  nombre: { type: 'string', example: 'Norte' },
                },
              },
            },
          },
        },
        responses: {
          '500': { description: 'Error interno del servidor' },
          '201': {
            description: 'Sede creada exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: '4' },
                    nombre: { type: 'string', example: 'Norte' },
                  },
                },
              },
            },
          },
          '400': { description: 'Error de validación (nombre de sede vacío)' },
          '401': { description: 'Acceso no autorizado' },
          '403': { description: 'Acceso denegado (solo el administrador general puede crear sedes)' },
          '409': { description: 'La sede especificada ya existe' },
        },
      },
    },
  },
};
