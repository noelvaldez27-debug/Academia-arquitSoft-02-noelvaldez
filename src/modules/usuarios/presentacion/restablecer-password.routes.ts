import { Router } from 'express';
import type { MiddlewareAutenticacion } from './autenticacion.middleware';
import { RolUsuario } from '../dominio';
import type { RestablecerPasswordUseCase } from '../aplicacion/restablecer-password.use-case';
import { ErrorAccesoDenegado, ErrorValidacion } from '../dominio';

export function crearRutasRestablecerPassword(
  middleware: MiddlewareAutenticacion,
  useCase: RestablecerPasswordUseCase,
): Router {
  const router = Router();
  router.post('/estudiantes/:id/password/restablecer', middleware.autenticar,
    middleware.requerirRol(RolUsuario.Administrador), async (req, res) => {
      res.set('Cache-Control', 'private, no-store');
      try {
        const resultado = await useCase.ejecutar(String(req.params.id), req.usuario!.id,
          req.body?.identidadVerificada === true);
        res.status(200).json(resultado);
      } catch (error) {
        if (error instanceof ErrorValidacion) {
          res.status(400).json({ error: error.message });
        } else if (error instanceof ErrorAccesoDenegado) {
          res.status(403).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Error interno del servidor.' });
        }
      }
    });
  return router;
}
