import { Router } from 'express';
import { AlcanceAdministrador, MiddlewareAutenticacion, RolUsuario } from '../../usuarios';
import { TransaccionExamen } from '../aplicacion/transaccion-examen.port';
import { ErrorRendicion } from '../dominio/error-rendicion';

export function crearRutasCierreSimulacro(auth: MiddlewareAutenticacion, transaccion: TransaccionExamen): Router {
  const router = Router();
  router.post('/simulacros/:id/cierre', auth.autenticar, async (req, res) => {
    const actor = req.usuario;
    if (actor?.rol !== RolUsuario.Administrador || actor.alcanceAdministrador !== AlcanceAdministrador.General) {
      res.sendStatus(403);
      return;
    }
    const id = String(req.params.id).trim();
    if (!id) { res.sendStatus(400); return; }
    try {
      const cierre = await transaccion(async ({ consultarSimulacro, solicitarCierre }) => {
        const registro = await solicitarCierre!(id, actor.id);
        await consultarSimulacro(id);
        return registro;
      });
      res.status(cierre.cerradoEn ? 200 : 202).json(cierre);
    } catch (error) {
      if (error instanceof ErrorRendicion) {
        res.status(error.codigo === 'no-encontrado' ? 404 : 409).json({ error: error.message });
        return;
      }
      res.sendStatus(503);
    }
  });
  return router;
}
