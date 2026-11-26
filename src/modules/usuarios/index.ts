/**
 * API pública — Módulo Gestión de Usuarios (ADR-001, ADR-002, CA-U07)
 * Expone exclusivamente los puertos, contratos y tipos necesarios para que
 * otros módulos autentiquen, autoricen y consulten usuarios sin
 * acceder directamente a repositorios ni tablas de la base de datos.
 *
 * Ninguna contraseña ni hash es accesible a través de estos puertos (AC04).
 */

// Roles y alcances de autorización
export {
  RolUsuario,
  AlcanceAdministrador,
} from './dominio/rol-usuario';

// Middleware y tipos para autenticar y autorizar peticiones por rol y sede
export {
  MiddlewareAutenticacion,
  UsuarioAutenticadoRequest,
} from './presentacion/autenticacion.middleware';

// Puerto y DTO para consultar un usuario por su identificador con sede y carrera
export {
  ServicioConsultaUsuarios,
  UsuarioPublicoDTO,
} from './aplicacion/consultar-usuario.port';

export {
  ConsultarUsuarioUseCase,
} from './aplicacion/consultar-usuario.use-case';

// Raíz de composición para arranque del módulo en el servidor
export {
  UsuariosModule,
  ConfigModuloUsuarios,
} from './usuarios.module';
export { crearConsultaPostulanteHabilitado } from './infraestructura/postgres-archivar-postulantes';
