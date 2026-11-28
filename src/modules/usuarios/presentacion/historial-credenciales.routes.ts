import { Router } from 'express';
import type { MiddlewareAutenticacion } from './autenticacion.middleware';
import { RolUsuario, ErrorAccesoDenegado, ErrorValidacion } from '../dominio';
import type { ConsultarHistorialCredencialesUseCase } from '../aplicacion/consultar-historial-credenciales.use-case';

export function crearRutasHistorialCredenciales(
  middleware: MiddlewareAutenticacion,
  useCase: ConsultarHistorialCredencialesUseCase,
): Router {
  const router = Router();
  router.get('/estudiantes/:id/credenciales/historial', middleware.autenticar,
    middleware.requerirRol(RolUsuario.Administrador), async (req, res) => {
      try {
        const resultado = await useCase.ejecutar(String(req.params.id), req.usuario!.id,
          req.query.pagina, req.query.limite);
        res.status(200).json(resultado);
      } catch (error) {
        if (error instanceof ErrorValidacion) res.status(400).json({ error: error.message });
        else if (error instanceof ErrorAccesoDenegado) res.status(403).json({ error: error.message });
        else res.status(500).json({ error: 'Error interno del servidor.' });
      }
    });
  return router;
}
