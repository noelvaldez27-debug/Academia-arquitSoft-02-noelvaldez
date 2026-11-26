import { Router } from 'express';
import { AlcanceAdministrador, MiddlewareAutenticacion, RolUsuario } from '../../usuarios';
import { TransaccionExamen } from '../aplicacion/transaccion-examen.port';
import { ErrorRendicion } from '../dominio/error-rendicion';

export function crearRutasCierreSimulacro(auth: MiddlewareAutenticacion, transaccion: TransaccionExamen,
  existeSimulacro: (id: string) => Promise<boolean>): Router {
  const router = Router();
  router.post('/simulacros/:id/habilitar', auth.autenticar, async (req, res) => {
    const actor = req.usuario;
    if (actor?.rol !== RolUsuario.Administrador || actor.alcanceAdministrador !== AlcanceAdministrador.General) {
      res.sendStatus(403);
      return;
    }
    const id = String(req.params.id).trim();
    const ciclo = req.body?.cicloId;
    if (!id || typeof ciclo !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(ciclo)) {
      res.sendStatus(400);
      return;
    }
    try {
      const padron = await transaccion(({ habilitarSimulacro }) => habilitarSimulacro!(id, ciclo.toLowerCase(), actor.id));
      res.json({ simulacroId: id, ...padron });
    } catch (error) {
      if (error instanceof ErrorRendicion) res.status(error.codigo === 'no-encontrado' ? 404 : 409).json({ error: error.message });
      else if (error instanceof Error && error.name === 'ErrorNoEncontrado') res.status(404).json({ error: error.message });
      else if (error instanceof Error && error.name === 'ErrorConflicto') res.status(409).json({ error: error.message });
      else res.sendStatus(503);
    }
  });
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
