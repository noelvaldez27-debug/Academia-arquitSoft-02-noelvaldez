import { Router } from 'express';
import { GestionarTemasUseCase } from '../aplicacion/gestionar-temas.use-case';
import { actorBanco } from './actor-banco';
import { parametro, responder } from './responder';

export function crearRutasTemas(casos: GestionarTemasUseCase): Router {
  const router = Router();
  router.get('/cursos/:cursoId/temas', responder(req => casos.listar(actorBanco(req), parametro(req, 'cursoId'))));
  router.post('/cursos/:cursoId/temas', responder(req =>
    casos.crear(actorBanco(req), parametro(req, 'cursoId'), req.body?.nombre), 201));
  router.put('/temas/:id', responder(req => casos.editar(actorBanco(req), parametro(req, 'id'), req.body?.nombre)));
  router.patch('/temas/:id/desactivar', responder(req => casos.desactivar(actorBanco(req), parametro(req, 'id'))));
  return router;
}
