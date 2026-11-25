import { Router } from 'express';
import { MiddlewareAutenticacion } from '../../usuarios';
import { GestionarPreguntasUseCase } from '../aplicacion/gestionar-preguntas.use-case';
import { actorBanco } from './actor-banco';
import { parametro, responder } from './responder';

export function crearRutasPreguntas(casos: GestionarPreguntasUseCase, auth: MiddlewareAutenticacion): Router {
  const router = Router();
  router.use(auth.autenticar);
  router.post('/cursos', responder(req => casos.guardarCurso(actorBanco(req), req.body?.nombre), 201));
  router.get('/cursos/:cursoId/preguntas', responder(req => casos.listar(actorBanco(req), parametro(req, 'cursoId'))));
  router.post('/cursos/:cursoId/preguntas', responder(req => casos.crear(actorBanco(req), parametro(req, 'cursoId'), req.body), 201));
  router.put('/preguntas/:id', responder(req => casos.editar(actorBanco(req), parametro(req, 'id'), req.body ?? {})));
  return router;
}
