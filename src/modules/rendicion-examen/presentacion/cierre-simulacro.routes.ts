import { Router } from 'express';
import { AlcanceAdministrador, MiddlewareAutenticacion, RolUsuario } from '../../usuarios';
import { TransaccionExamen } from '../aplicacion/transaccion-examen.port';

export function crearRutasCierreSimulacro(auth: MiddlewareAutenticacion, transaccion: TransaccionExamen,
  existeSimulacro: (id: string) => Promise<boolean>): Router {
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
      if (!await existeSimulacro(id)) { res.sendStatus(404); return; }
      const cierre = await transaccion(({ solicitarCierre }) => solicitarCierre!(id, actor.id));
      res.status(cierre.cerradoEn ? 200 : 202).json(cierre);
    } catch {
      res.sendStatus(503);
    }
  });
  return router;
}
