import { Router } from 'express';
import multer from 'multer';
import { SubirSeparataUseCase } from '../aplicacion/subir-separata.use-case';
import { ErrorBancoPreguntas } from '../dominio/errores';
import { actorBanco } from './actor-banco';
import { parametro, responder } from './responder';

export function crearRutasSeparata(subir: SubirSeparataUseCase, maxBytes: number): Router {
  const router = Router();
  const recibir = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, fields: 0, files: 1 } })
    .single('archivo');
  router.post('/cursos/:cursoId/separatas', (req, res, next) => {
    if (actorBanco(req).permiso !== 'docente') {
      res.status(403).json({ error: 'Se requiere un docente.' });
      return;
    }
    recibir(req, res, error => {
      if (error) res.status(400).json({ error: 'Adjunta un archivo dentro del límite permitido.' });
      else next();
    });
  }, responder(req => {
    if (!req.file) throw new ErrorBancoPreguntas('validacion', 'Adjunta la separata en el campo archivo.');
    return subir.ejecutar(actorBanco(req), parametro(req, 'cursoId'), req.file.originalname, req.file.buffer);
  }, 202));
  return router;
}
