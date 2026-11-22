import { Router } from 'express';
import { UsuarioController } from './usuario.controller';
import { MiddlewareAutenticacion } from './autenticacion.middleware';
import { RolUsuario } from '../dominio';

/**
 * Rutas REST del módulo Gestión de Usuarios (ADR-008).
 * Define endpoints protegidos con autenticación y autorización por rol.
 */
export function crearRutasUsuario(
  controller: UsuarioController,
  middleware: MiddlewareAutenticacion
): Router {
  const router = Router();

  // POST /login - Iniciar sesión (público)
  router.post('/login', controller.iniciarSesion);

  // POST /estudiantes - Registrar estudiante (Administrador general o de sede)
  router.post(
    '/estudiantes',
    middleware.autenticar,
    middleware.requerirRol(RolUsuario.Administrador),
    controller.registrarEstudiante
  );

  // POST /docentes - Registrar docente (Solo Administrador general)
  router.post(
    '/docentes',
    middleware.autenticar,
    middleware.requerirRol(RolUsuario.Administrador),
    controller.registrarDocente
  );

  // PATCH /password - Cambiar la propia contraseña (Cualquier rol autenticado)
  router.patch(
    '/password',
    middleware.autenticar,
    controller.cambiarPassword
  );

  return router;
}
