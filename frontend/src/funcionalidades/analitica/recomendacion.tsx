import { useEffect, useRef, useState } from 'react';
import { usarSesion } from '../../app/sesion';
import { Boton, Estado } from '../../compartido/controles';
import { textoFallo } from '../banco-preguntas/lecturas';
import { rutaAnalitica } from './historial';

type Recomendacion = { estado: 'evidencia_insuficiente' | 'sin_prioridades' } | {
  estado: 'vigente'; origen: 'ia' | 'local'; contenido: string; cursos: string[]; generadaEn: string;
};

export function MiRecomendacion() {
  const { solicitar } = usarSesion();
  const [respuesta, guardar] = useState<Recomendacion>();
  const [error, fallar] = useState('');
  const [ocupado, ocupar] = useState(false);
  const actual = useRef<AbortController | null>(null);
  useEffect(() => () => actual.current?.abort(), []);

  async function consultar() {
    if (actual.current) return;
    const control = new AbortController();
    actual.current = control;
    ocupar(true);
    fallar('');
    guardar(undefined);
    try {
      const datos = await solicitar<Recomendacion>(rutaAnalitica + '/mi-recomendacion', { method: 'POST', signal: control.signal });
      if (!control.signal.aborted) guardar(datos);
    } catch (causa) {
      if (!control.signal.aborted) fallar(textoFallo(causa));
    } finally {
      actual.current = null;
      if (!control.signal.aborted) ocupar(false);
    }
  }

  return <div className="mt-6 grid max-w-3xl gap-5">
    <p>Consulta tu recomendación de refuerzo a partir de tus simulacros calificados.</p>
    <Boton className="w-fit" disabled={ocupado} onClick={() => void consultar()}>Consultar recomendación</Boton>
    {ocupado && <Estado tipo="carga">Consultando recomendación…</Estado>}
    {error && <Estado tipo="error">{error}</Estado>}
    {respuesta?.estado === 'evidencia_insuficiente' && <Estado>Aún no hay cinco preguntas evaluadas en un mismo curso.</Estado>}
    {respuesta?.estado === 'sin_prioridades' && <Estado>No hay cursos prioritarios con la evidencia disponible.</Estado>}
    {respuesta?.estado === 'vigente' && <section className="panel-acceso grid gap-3" aria-labelledby="refuerzo">
      <h2 id="refuerzo" className="text-xl font-bold">Tu plan de refuerzo</h2>
      <p className="text-sm">{respuesta.origen === 'local' ? 'Origen: recomendación local' : 'Origen: asistencia de IA'}</p>
      <p className="whitespace-pre-wrap break-words">{respuesta.contenido}</p>
    </section>}
  </div>;
}
