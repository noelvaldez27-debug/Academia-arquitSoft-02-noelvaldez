import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Boton, Campo, CampoPassword, Estado } from '../compartido/controles';
import { Marca } from '../compartido/marca';
import { usarSesion } from './sesion';

export function Acceso() {
  const { sesion, vencida, aviso, ingresar } = usarSesion();
  const [error, guardarError] = useState('');
  const [ocupado, ocupar] = useState(false);
  const solicitud = useRef<AbortController | null>(null);
  useEffect(() => () => solicitud.current?.abort(), []);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (solicitud.current) return;
    const datos = new FormData(evento.currentTarget);
    const control = new AbortController();
    solicitud.current = control;
    ocupar(true);
    guardarError('');
    try {
      await ingresar(String(datos.get('correo') ?? '').trim(), String(datos.get('password') ?? ''), control.signal);
    } catch (fallo) {
      if (!control.signal.aborted) guardarError(fallo instanceof Error ? fallo.message : 'No se pudo ingresar.');
    } finally {
      solicitud.current = null;
      if (!control.signal.aborted) ocupar(false);
    }
  }

  if (sesion) return <Navigate to={sesion.cambioInicial ? '/cuenta/clave-inicial' : `/panel/${sesion.perfil}`} replace />;

  return (
    <main className="acceso">
      <section className="acceso-marca bg-marino text-white" aria-label="Academia Sofía">
        <Marca />
        <div className="acceso-titulo">
          <p className="mb-4 text-sm font-semibold text-blue-200">Plataforma de simulacros</p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">Simulacros de la Academia Sofía</h1>
        </div>
        <div className="acceso-trama" aria-hidden="true" />
      </section>
      <section className="acceso-forma" aria-labelledby="titulo-acceso">
        <div className="w-full max-w-sm">
          <h2 id="titulo-acceso" className="text-3xl font-bold tracking-tight">Iniciar sesión</h2>
          <p className="mt-3 text-slate-600">Usa el correo y la contraseña que te asignó la academia.</p>
          <form className="mt-8 grid gap-5" onSubmit={enviar} aria-busy={ocupado}>
            {aviso && <Estado>{aviso}</Estado>}
            {vencida && <Estado>Tu sesión terminó. Vuelve a ingresar.</Estado>}
            {error && <Estado tipo="error">{error}</Estado>}
            <Campo etiqueta="Correo institucional" id="correo" name="correo" type="email" autoComplete="username" required />
            <CampoPassword etiqueta="Contraseña" id="password" name="password" autoComplete="current-password" required />
            <Boton type="submit" disabled={ocupado}>{ocupado ? 'Ingresando…' : 'Ingresar'}</Boton>
          </form>
          <p className="mt-7 border-t border-slate-200 pt-5 text-sm text-slate-600">Si tienes problemas de acceso, comunícate con la academia.</p>
        </div>
      </section>
    </main>
  );
}
