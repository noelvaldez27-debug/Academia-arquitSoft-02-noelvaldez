import { Router } from 'express';
import { AlcanceAdministrador, RolUsuario } from '../dominio';
import type { MiddlewareAutenticacion } from './autenticacion.middleware';

export interface DatosCiclo {
  nombre: string;
  iniciaEl: string;
  terminaEl: string;
}

export function crearRutasCiclos(auth: MiddlewareAutenticacion,
  listar: () => Promise<unknown>, crear: (datos: DatosCiclo) => Promise<unknown>) {
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
  return router;
}

function fechaValida(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor.startsWith('0000')) return false;
  const fecha = new Date(valor + 'T00:00:00.000Z');
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}
