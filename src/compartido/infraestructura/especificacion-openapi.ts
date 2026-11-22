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
    '/api/usuarios/estudiantes': {
      post: {
        summary: 'Registrar estudiante (postulante)',
        description:
          'Registra un postulante con nombre, DNI, sede y carrera. Requiere rol Administrador (general o de sede propia). Genera credenciales automáticas con formato dni@sofia.edu y hash de contraseña.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'dni', 'sedeId', 'carrera'],
                properties: {
                  nombre: { type: 'string', example: 'Juan Alumno' },
                  dni: { type: 'string', example: '71234567' },
                  sedeId: { type: 'string', example: 'Hana' },
                  carrera: { type: 'string', example: 'Medicina Humana' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Estudiante registrado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    nombre: { type: 'string' },
                    dni: { type: 'string' },
                    correo: { type: 'string' },
                    rol: { type: 'string', example: 'POSTULANTE' },
                    sedeId: { type: 'string' },
                    carrera: { type: 'string' },
                    activo: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Error de validación (campos requeridos, formato DNI o sede inexistente)',
          },
          '401': {
            description: 'Acceso no autorizado (token no proporcionado o expirado)',
          },
          '403': {
            description: 'Acceso denegado (rol sin permisos o administrador de otra sede)',
          },
          '409': {
            description: 'Conflicto: el DNI ya se encuentra registrado',
          },
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
  },
};
