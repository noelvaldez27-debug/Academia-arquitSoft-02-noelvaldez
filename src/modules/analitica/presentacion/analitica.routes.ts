import { ErrorRequestHandler, Router } from 'express';
import { MiddlewareAutenticacion, RolUsuario } from '../../usuarios';
import { ConsultarHistorialUseCase } from '../aplicacion/consultar-historial.use-case';
import { GenerarRecomendacionUseCase } from '../aplicacion/generar-recomendacion.use-case';

export function crearRutasAnalitica(auth: MiddlewareAutenticacion,
  historial: ConsultarHistorialUseCase, recomendacion: GenerarRecomendacionUseCase) {
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
  const manejarError: ErrorRequestHandler = (_error, _req, res, next) => {
    if (res.headersSent) { next(_error); return; }
    res.status(500).json({ error: 'No se pudo consultar la información académica.' });
  };
  router.use(manejarError);
  return router;
}
