import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Boton, Campo, CampoPassword, Estado } from '../compartido/controles';
import { usarSesion } from './sesion';

export function FormularioCuenta({ correo = false, inicial = false }: { correo?: boolean; inicial?: boolean }) {
  const { solicitar, completarCambio } = usarSesion();
  const pendiente = useRef<AbortController | null>(null);
  const [ocupado, ocupar] = useState(false);
  const [error, cambiarError] = useState('');
  useEffect(() => () => pendiente.current?.abort(), []);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente.current) return;
    const datos = new FormData(evento.currentTarget);
    const passwordActual = datos.get('actual');
    const nueva = datos.get('nueva');
    if (!correo && nueva !== datos.get('confirmacion')) {
      cambiarError('Las contraseñas nuevas deben coincidir.');
      return;
    }
    const control = new AbortController();
    pendiente.current = control;
    ocupar(true);
    cambiarError('');
    try {
      await solicitar('/api/usuarios/' + (correo ? 'correo' : 'password'), {
        method: 'PATCH', signal: control.signal,
        datos: correo ? { passwordActual, nuevoCorreo: nueva } : { passwordActual, passwordNueva: nueva },
      });
      if (!control.signal.aborted) completarCambio(correo ? 'Correo actualizado.' : 'Contraseña actualizada.');
    } catch (fallo) {
      if (!control.signal.aborted) cambiarError(fallo instanceof Error ? fallo.message : 'No se pudo guardar.');
    } finally {
      pendiente.current = null;
      if (!control.signal.aborted) ocupar(false);
    }
  }

  const id = correo ? 'correo-cuenta' : 'clave-cuenta';
  return (
    <form className="grid max-w-lg gap-4" onSubmit={guardar} aria-busy={ocupado}>
      {error && <Estado tipo="error">{error}</Estado>}
      <CampoPassword id={id + '-actual'} name="actual" etiqueta={inicial ? 'Contraseña provisional' : 'Contraseña actual'} autoComplete="current-password" required />
      {correo
        ? <Campo id={id + '-nueva'} name="nueva" etiqueta="Nuevo correo" type="email" autoComplete="email" required />
        : <CampoPassword id={id + '-nueva'} name="nueva" etiqueta="Nueva contraseña" minLength={8} autoComplete="new-password" required />}
      {!correo && <CampoPassword id={id + '-confirmacion'} name="confirmacion" etiqueta="Confirmar nueva contraseña"
        autoComplete="new-password" required />}
      <Boton type="submit" disabled={ocupado}>{ocupado ? 'Guardando…' : correo ? 'Actualizar correo' : 'Cambiar contraseña'}</Boton>
    </form>
  );
}
