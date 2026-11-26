import { Router, type Request } from 'express';
import { ErrorBancoPreguntas } from '../dominio/errores';
import type { ConsultarCatalogosBanco } from '../aplicacion/consultar-catalogos-banco';
import { actorBanco } from './actor-banco';
import { parametro, responder } from './responder';

export function paginaBanco(req: Request) {
  const entero = (entrada: unknown, defecto: number, maximo: number) => {
    if (entrada === undefined) return defecto;
    if (typeof entrada !== 'string' || !/^[1-9]\d*$/.test(entrada) || Number(entrada) > maximo) {
      throw new ErrorBancoPreguntas('validacion', 'Indica una página y un límite válidos.');
    }
    return Number(entrada);
  };
  const q = req.query.q ?? '';
  if (typeof q !== 'string' || q.trim().length > 160) {
    throw new ErrorBancoPreguntas('validacion', 'La búsqueda debe tener hasta 160 caracteres.');
  }
  return { pagina: entero(req.query.pagina, 1, 10000), limite: entero(req.query.limite, 20, 100), q: q.trim() };
}

export function crearRutasCatalogos(catalogos: ConsultarCatalogosBanco) {
  const router = Router();
  router.get('/cursos', responder(req => catalogos.cursos(actorBanco(req), paginaBanco(req))));
  router.get('/simulacros', responder(req => catalogos.simulacros(actorBanco(req), paginaBanco(req))));
  router.get('/cursos/:cursoId/docentes', responder(req =>
    catalogos.docentes(actorBanco(req), parametro(req, 'cursoId'), paginaBanco(req))));
  return router;
}
