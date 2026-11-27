import { Request, Response, Router } from 'express';
import multer from 'multer';
import { ConsultarCargaMasivaUseCase } from '../aplicacion/consultar-carga-masiva.use-case';
import { PrepararCargaMasivaUseCase } from '../aplicacion/preparar-carga-masiva.use-case';
import { ErrorAccesoDenegado, ErrorConflicto, ErrorNoEncontrado, ErrorValidacion, RolUsuario } from '../dominio';
import { MiddlewareAutenticacion } from './autenticacion.middleware';

import type { ListarCargasMasivasUseCase } from '../aplicacion/listar-cargas-masivas.use-case';

export function crearRutasCargaMasiva(
  preparar: PrepararCargaMasivaUseCase,
  consultar: ConsultarCargaMasivaUseCase,
  autenticacion: MiddlewareAutenticacion,
  maxMb: number,
  listar?: ListarCargasMasivasUseCase,
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
      if (typeof req.query.cicloId !== 'string' ||
          !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(req.query.cicloId)) {
        throw new ErrorValidacion('Selecciona un ciclo académico abierto para la importación.');
      }
      const id = await preparar.ejecutar(req.file.buffer, req.usuario!, req.query.cicloId);
      res.status(202).location('/api/usuarios/cargas-masivas/' + id).json({ id });
    } catch (error) {
      responderError(res, error);
    }
  });

  if (listar) router.get('/cargas-masivas', autenticacion.autenticar, administrador, async (req, res) => {
    try {
      const pagina = enteroLimitado(req.query.pagina, 1, 10_000);
      const limite = enteroLimitado(req.query.limite, 20, 100);
      res.json(await listar.ejecutar(req.usuario!, pagina, limite));
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

function enteroLimitado(valor: unknown, defecto: number, maximo: number): number {
  if (valor === undefined) return defecto;
  if (typeof valor !== 'string' || !/^[1-9]d*$/.test(valor) || Number(valor) > maximo) {
    throw new ErrorValidacion('La paginación indicada es inválida.');
  }
  return Number(valor);
}

function responderError(res: Response, error: unknown): void {
  if (error instanceof ErrorValidacion) res.status(400).json({ error: error.message });
  else if (error instanceof ErrorAccesoDenegado) res.status(403).json({ error: error.message });
  else if (error instanceof ErrorNoEncontrado) res.status(404).json({ error: error.message });
  else if (error instanceof ErrorConflicto) res.status(409).json({ error: error.message });
  else res.status(500).json({ error: 'No se pudo procesar la solicitud.' });
}
