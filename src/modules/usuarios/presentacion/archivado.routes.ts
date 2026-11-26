import { Router } from 'express';
import { ErrorAccesoDenegado, ErrorConflicto, ErrorNoEncontrado, RolUsuario } from '../dominio';
import type { EjecutorAccion } from '../aplicacion/registrar-estudiante.command';
import type { MiddlewareAutenticacion } from './autenticacion.middleware';

export function crearRutasArchivado(auth: MiddlewareAutenticacion,
  archivado?: (actor: EjecutorAccion, ids: string[]) => Promise<{ archivados: number }>) {
  const router = Router();
  router.post('/estudiantes/archivar', auth.autenticar,
    auth.requerirRol(RolUsuario.Administrador), async (req, res) => {
      const ids: unknown = req.body?.ids;
      if (!Array.isArray(ids) || !ids.length || ids.length > 1000 || ids.some(id =>
        typeof id !== 'string' || !/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647)) {
        res.status(400).json({ error: 'Indica entre 1 y 1000 identificadores de postulantes.' });
        return;
      }
      try {
        if (!archivado) throw new Error('Archivado no disponible.');
        res.json(await archivado(req.usuario!, [...new Set<string>(ids)]));
      } catch (error) {
        if (error instanceof ErrorAccesoDenegado) res.status(403).json({ error: error.message });
        else if (error instanceof ErrorNoEncontrado) res.status(404).json({ error: error.message });
        else if (error instanceof ErrorConflicto) res.status(409).json({ error: error.message });
        else res.status(503).json({ error: 'El archivado no está disponible temporalmente.' });
      }
    });
  return router;
}
