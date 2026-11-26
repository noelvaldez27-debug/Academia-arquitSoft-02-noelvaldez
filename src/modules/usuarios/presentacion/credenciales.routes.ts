import { Router } from 'express';
import { AlcanceAdministrador, RolUsuario } from '../dominio';
import type { MiddlewareAutenticacion } from './autenticacion.middleware';

export function crearRutasEntregaCredenciales(auth: MiddlewareAutenticacion,
  consumir: (administradorId: string, sedeId: string | null, id: string, masiva: boolean) => Promise<Buffer | null>) {
  const router = Router();
  const administrador = auth.requerirRol(RolUsuario.Administrador);
  for (const masiva of [false, true]) {
    router.post(masiva ? '/cargas-masivas/:id/credenciales' : '/estudiantes/:id/credenciales',
      auth.autenticar, administrador, async (req, res) => {
        const id = String(req.params.id);
        const valido = masiva ? /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)
          : /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2147483647;
        if (!valido) {
          res.status(400).json({ error: 'Identificador inválido.' });
          return;
        }
        const actor = req.usuario!;
        const sede = actor.alcanceAdministrador === AlcanceAdministrador.General ? null : actor.sedeId;
        try {
          const archivo = await consumir(actor.id, sede, id, masiva);
          if (!archivo) {
            res.status(404).json({ error: 'Entrega no disponible.' });
            return;
          }
          res.set('Cache-Control', 'private, no-store').attachment('credenciales-provisionales.xlsx').send(archivo);
        } catch {
          res.status(503).json({ error: 'No se pudo entregar el archivo.' });
        }
      });
  }
  return router;
}
