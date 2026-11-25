import { Router } from 'express';
import { GestionarAsignacionesUseCase } from '../aplicacion/gestionar-asignaciones.use-case';
import { actorBanco } from './actor-banco';
import { parametro, responder } from './responder';

export function crearRutasAsignaciones(caso: GestionarAsignacionesUseCase): Router {
  const router = Router();
  const ruta = '/cursos/:cursoId/docentes/:docenteId';
  router.put(ruta, responder(req => caso.ejecutar(actorBanco(req),
    parametro(req, 'docenteId'), parametro(req, 'cursoId'), true)));
  router.delete(ruta, responder(req => caso.ejecutar(actorBanco(req),
    parametro(req, 'docenteId'), parametro(req, 'cursoId'), false)));
  return router;
}
