import { Router } from 'express';
import { GestionarSimulacrosUseCase } from '../aplicacion/gestionar-simulacros.use-case';
import { requerirGeneral } from '../aplicacion/gestionar-preguntas.use-case';
import { actorBanco } from './actor-banco';
import { parametro, responder } from './responder';

export function crearRutasSimulacros(casos: GestionarSimulacrosUseCase): Router {
  const router = Router();
  router.post('/simulacros', responder(req => casos.guardar(actorBanco(req), req.body), 201));
  router.put('/simulacros/:id', responder(req => casos.guardar(actorBanco(req), req.body, parametro(req, 'id'))));
  router.get('/simulacros/:id', responder(req => {
    requerirGeneral(actorBanco(req));
    return casos.consultar(parametro(req, 'id'));
  }));
  return router;
}
