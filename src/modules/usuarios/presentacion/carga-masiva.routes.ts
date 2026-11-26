import { Request, Response, Router } from 'express';
import multer from 'multer';
import { ConsultarCargaMasivaUseCase } from '../aplicacion/consultar-carga-masiva.use-case';
import { PrepararCargaMasivaUseCase } from '../aplicacion/preparar-carga-masiva.use-case';
import { ErrorAccesoDenegado, ErrorConflicto, ErrorNoEncontrado, ErrorValidacion, RolUsuario } from '../dominio';
import { MiddlewareAutenticacion } from './autenticacion.middleware';

export function crearRutasCargaMasiva(
  preparar: PrepararCargaMasivaUseCase,
  consultar: ConsultarCargaMasivaUseCase,
  autenticacion: MiddlewareAutenticacion,
  maxMb: number,
): Router {
  const router = Router();
  const administrador = autenticacion.requerirRol(RolUsuario.Administrador);
  const recibirArchivo = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: Math.floor(maxMb * 1024 * 1024), files: 1, fields: 0 },
  }).single('archivo');

  router.post('/cargas-masivas', autenticacion.autenticar, administrador, (req, res, next) => {
    recibirArchivo(req, res, error => {
      if (error) {
        res.status(400).json({ error: 'Adjunta un solo archivo .xlsx dentro del límite permitido.' });
        return;
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file || !/\.xlsx$/i.test(req.file.originalname)) {
        throw new ErrorValidacion('Es obligatorio adjuntar un archivo .xlsx.');
      }
      const id = req.query.cicloId === undefined
        ? await preparar.ejecutar(req.file.buffer, req.usuario!)
        : await preparar.ejecutar(req.file.buffer, req.usuario!, req.query.cicloId);
      res.status(202).location('/api/usuarios/cargas-masivas/' + id).json({ id });
    } catch (error) {
      responderError(res, error);
    }
  });

  router.get('/cargas-masivas/:id', autenticacion.autenticar, administrador, async (req: Request<{ id: string }>, res) => {
    try {
      if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(req.params.id)) {
        throw new ErrorValidacion('El identificador de carga debe ser un UUID.');
      }
      res.json(await consultar.ejecutar(req.params.id, req.usuario!));
    } catch (error) {
      responderError(res, error);
    }
  });

  return router;
}

function responderError(res: Response, error: unknown): void {
  if (error instanceof ErrorValidacion) res.status(400).json({ error: error.message });
  else if (error instanceof ErrorAccesoDenegado) res.status(403).json({ error: error.message });
  else if (error instanceof ErrorNoEncontrado) res.status(404).json({ error: error.message });
  else if (error instanceof ErrorConflicto) res.status(409).json({ error: error.message });
  else res.status(500).json({ error: 'No se pudo procesar la solicitud.' });
}
