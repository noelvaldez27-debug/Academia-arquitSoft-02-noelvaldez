import { ErrorRequestHandler, Request, Router } from 'express';
import { AlcanceAdministrador, MiddlewareAutenticacion, RolUsuario } from '../../usuarios';
import { ActorEstadisticas, ConsultarEstadisticasUseCase, ErrorEstadisticas } from '../aplicacion/consultar-estadisticas.use-case';
import { ConsultarHistorialUseCase } from '../aplicacion/consultar-historial.use-case';
import { GenerarRecomendacionUseCase } from '../aplicacion/generar-recomendacion.use-case';

export function crearRutasAnalitica(auth: MiddlewareAutenticacion,
  historial: ConsultarHistorialUseCase, recomendacion: GenerarRecomendacionUseCase,
  estadisticas: ConsultarEstadisticasUseCase) {
  const router = Router();
  const postulante = auth.requerirRol(RolUsuario.Postulante);
  router.get('/mi-historial', auth.autenticar, postulante, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { historial: filas, porCurso } = await historial.ejecutar(req.usuario!.id);
    res.json({ historial: filas, porCurso });
  });
  router.post('/mi-recomendacion', auth.autenticar, postulante, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await recomendacion.ejecutar(req.usuario!.id));
  });
  router.get('/estadisticas', auth.autenticar, async (req, res) => {
    const actor = actorEstadisticas(req);
    const filtros = {
      simulacroId: filtro(req, 'simulacroId'), cursoId: filtro(req, 'cursoId'),
      temaId: filtro(req, 'temaId'), sedeId: filtro(req, 'sedeId'),
    };
    res.set('Cache-Control', 'private, no-store').json(await estadisticas.ejecutar(actor, filtros));
  });
  const manejarError: ErrorRequestHandler = (_error, _req, res, next) => {
    if (res.headersSent) { next(_error); return; }
    if (_error instanceof ErrorEstadisticas) {
      res.status(_error.estado).json({ error: _error.message });
      return;
    }
    res.status(500).json({ error: 'No se pudo consultar la información académica.' });
  };
  router.use(manejarError);
  return router;
}

function actorEstadisticas(req: Request): ActorEstadisticas {
  const usuario = req.usuario;
  if (usuario?.rol === RolUsuario.Docente) return { rol: 'docente', id: usuario.id };
  if (usuario?.rol === RolUsuario.Administrador) {
    if (usuario.alcanceAdministrador === AlcanceAdministrador.General) return { rol: 'general', id: usuario.id };
    if (usuario.alcanceAdministrador === AlcanceAdministrador.Sede && usuario.sedeId) {
      return { rol: 'sede', id: usuario.id, sedeId: usuario.sedeId };
    }
  }
  throw new ErrorEstadisticas(403, 'No tiene acceso a estadísticas grupales.');
}

function filtro(req: Request, nombre: string) {
  const valor = req.query[nombre];
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || !valor.trim() || valor.length > 255) {
    throw new ErrorEstadisticas(400, 'Filtro inválido.');
  }
  return valor.trim();
}
