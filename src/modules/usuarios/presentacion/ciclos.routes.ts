import { Router } from 'express';
import { AlcanceAdministrador, ErrorAccesoDenegado, ErrorConflicto, ErrorNoEncontrado, RolUsuario } from '../dominio';
import type { MiddlewareAutenticacion } from './autenticacion.middleware';

export interface DatosCiclo {
  nombre: string;
  iniciaEl: string;
  terminaEl: string;
}

export function crearRutasCiclos(auth: MiddlewareAutenticacion,
  listar: () => Promise<unknown>, crear: (datos: DatosCiclo) => Promise<unknown>,
  cerrar: (id: string, actorId: string) => Promise<unknown>) {
  const router = Router();
  const admin = auth.requerirRol(RolUsuario.Administrador);
  router.get('/ciclos', auth.autenticar, admin, async (_req, res) => {
    try {
      res.json(await listar());
    } catch {
      res.status(503).json({ error: 'No se pudieron consultar los ciclos.' });
    }
  });
  router.post('/ciclos', auth.autenticar, admin, async (req, res) => {
    if (req.usuario?.alcanceAdministrador !== AlcanceAdministrador.General) {
      res.status(403).json({ error: 'Se requiere el administrador general.' });
      return;
    }
    const { nombre, iniciaEl, terminaEl } = req.body ?? {};
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 120 ||
        !fechaValida(iniciaEl) || !fechaValida(terminaEl) || terminaEl < iniciaEl) {
      res.status(400).json({ error: 'Indica nombre y fechas válidas del ciclo.' });
      return;
    }
    try {
      res.status(201).json(await crear({ nombre: nombre.trim(), iniciaEl, terminaEl }));
    } catch {
      res.status(503).json({ error: 'No se pudo crear el ciclo.' });
    }
  });
  router.post('/ciclos/:id/cierre', auth.autenticar, admin, async (req, res) => {
    if (req.usuario?.alcanceAdministrador !== AlcanceAdministrador.General) {
      res.sendStatus(403);
      return;
    }
    const id = String(req.params.id);
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) {
      res.sendStatus(400);
      return;
    }
    try {
      res.json(await cerrar(id, req.usuario.id));
    } catch (error) {
      if (error instanceof ErrorAccesoDenegado) res.status(403).json({ error: error.message });
      else if (error instanceof ErrorNoEncontrado) res.status(404).json({ error: error.message });
      else if (error instanceof ErrorConflicto) res.status(409).json({ error: error.message });
      else res.sendStatus(503);
    }
  });
  return router;
}

function fechaValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith('0000')) return false;
  const fecha = new Date(valor + 'T00:00:00.000Z');
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}
