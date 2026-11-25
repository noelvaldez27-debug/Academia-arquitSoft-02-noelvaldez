import { Router } from 'express';
import { RevisarSeparataUseCase } from '../aplicacion/revisar-separata.use-case';
import { actorBanco } from './actor-banco';
import { parametro, responder } from './responder';

export function crearRutasRevision(casos: RevisarSeparataUseCase): Router {
  const router = Router();
  router.get('/separatas/:id/archivo', responder(async (req, res) => {
    const { contenido, mime } = await casos.obtenerOriginal(actorBanco(req), parametro(req, 'id'));
    res.set('Cache-Control', 'no-store').set('Content-Disposition', 'attachment').type(mime).send(contenido);
  }));
  router.get('/separatas/:id', responder(req => casos.consultar(actorBanco(req), parametro(req, 'id'))));
  router.put('/separatas/:id/autorizacion', responder(req => casos.autorizar(actorBanco(req), parametro(req, 'id'), req.body)));
  router.put('/propuestas/:id', responder(req => casos.corregir(actorBanco(req), parametro(req, 'id'), req.body)));
  router.post('/propuestas/:id/aprobar', responder(req => casos.aprobar(actorBanco(req), parametro(req, 'id'))));
  router.post('/propuestas/:id/descartar', responder(req => casos.descartar(actorBanco(req), parametro(req, 'id'))));
  return router;
}
