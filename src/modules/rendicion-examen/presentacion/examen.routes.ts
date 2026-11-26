import { RequestHandler, Router } from 'express';
import { ExamenController } from './examen.controller';

export function crearRutasExamen(controlador: ExamenController, ...autorizar: RequestHandler[]): Router {
  const router = Router();
  router.use(...autorizar);
  router.post('/iniciar', controlador.iniciar);
  router.get('/simulacros', controlador.listar);
  router.get('/:id', controlador.consultar);
  router.put('/:id/respuestas', controlador.registrar);
  router.post('/:id/finalizar', controlador.finalizar);
  return router;
}
