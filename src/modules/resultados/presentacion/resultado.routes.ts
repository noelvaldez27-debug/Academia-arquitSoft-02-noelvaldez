import { RequestHandler, Router } from 'express';
import { ConsultarResultadoUseCase } from '../aplicacion/consultar-resultado.use-case';

export function crearRutasResultados(consultar: ConsultarResultadoUseCase, ...autorizar: RequestHandler[]) {
  const router = Router();
  router.get('/:id', ...autorizar, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const resultado = await consultar.ejecutar(String(req.params.id), req.usuario!.id);
      if (!resultado) {
        res.status(404).json({ error: 'Resultado no encontrado.' });
        return;
      }
      if (resultado.estado === 'PENDIENTE') res.setHeader('Retry-After', '2');
      res.status(resultado.estado === 'PENDIENTE' ? 202 : 200).json(resultado);
    } catch {
      res.status(503).json({ error: 'Resultados no está disponible temporalmente.' });
    }
  });
  return router;
}
