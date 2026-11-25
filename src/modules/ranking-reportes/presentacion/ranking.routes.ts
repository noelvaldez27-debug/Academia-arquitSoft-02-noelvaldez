import { Request, RequestHandler, Response, Router } from 'express';
import { AlcanceAdministrador, MiddlewareAutenticacion, RolUsuario } from '../../usuarios';
import { ActorRanking, ConsultarRankingUseCase, ErrorConsultaRanking } from '../aplicacion/consultar-ranking.use-case';

export function actorRanking(req: Request): ActorRanking {
  const usuario = req.usuario;
  if (usuario?.rol === RolUsuario.Postulante) return { rol: 'postulante', id: usuario.id };
  if (usuario?.rol === RolUsuario.Docente) return { rol: 'docente', id: usuario.id };
  if (usuario?.rol === RolUsuario.Administrador && usuario.alcanceAdministrador === AlcanceAdministrador.General) {
    return { rol: 'general', id: usuario.id };
  }
  if (usuario?.rol === RolUsuario.Administrador && usuario.alcanceAdministrador === AlcanceAdministrador.Sede && usuario.sedeId) {
    return { rol: 'sede', id: usuario.id, sedeId: usuario.sedeId };
  }
  throw new ErrorConsultaRanking(403, 'Rol sin acceso.');
}

export function filtro(req: Request, nombre: string): string | undefined {
  const valor = req.query[nombre];
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || !valor.trim() || valor.length > 255) {
    throw new ErrorConsultaRanking(400, 'Filtro inválido.');
  }
  return valor.trim();
}

export function responderRanking(ejecutar: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return async (req, res) => {
    try {
      const resultado = await ejecutar(req, res);
      if (!res.headersSent) res.json(resultado);
    } catch (error) {
      if (error instanceof ErrorConsultaRanking) {
        res.status(error.estado).json({ error: error.message });
      } else {
        res.status(503).json({ error: 'Consulta académica temporalmente no disponible.' });
      }
    }
  };
}

export function ambitoSolicitado(req: Request) {
  return { carrera: filtro(req, 'carrera')?.replace(/\s+/g, ' ').toUpperCase(), sedeId: filtro(req, 'sedeId') };
}

export function crearRutasRanking(caso: ConsultarRankingUseCase, auth: MiddlewareAutenticacion): Router {
  const router = Router();
  router.use(auth.autenticar);
  router.get('/:simulacroId/propio', responderRanking(req => caso.propio(actorRanking(req), String(req.params.simulacroId))));
  router.get('/:simulacroId', responderRanking(req =>
    caso.administrativo(actorRanking(req), String(req.params.simulacroId), ambitoSolicitado(req))));
  return router;
}
