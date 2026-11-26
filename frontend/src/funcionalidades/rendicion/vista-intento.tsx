import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Boton, Estado } from '../../compartido/controles';
import { alternativas, formatoTiempo, restante, type Alternativa, type Modo, type Reloj } from './contratos';

export interface MarcaVisible { numero: number; alternativa: Alternativa | null; pendiente?: boolean }

export function VistaIntento({ origen, modo, marcas, bloqueado = true, marcar, acciones, volver }: {
  origen: Reloj; modo: Modo; marcas?: MarcaVisible[]; bloqueado?: boolean;
  marcar?: (numero: number, alternativa: Alternativa | null) => void;
  acciones?: ReactNode; volver: () => void;
}) {
  const { intento } = origen;
  const [numero, ir] = useState(1);
  const [ahora, actualizar] = useState(() => performance.now());
  useEffect(() => {
    const reloj = setInterval(() => actualizar(performance.now()), 250);
    return () => clearInterval(reloj);
  }, []);
  const tiempo = restante(origen, ahora);
  const pregunta = intento.preguntas[numero - 1];
  const mapa = new Map<number, MarcaVisible>((marcas ?? intento.respuestas).map(m => [m.numero, m]));
  const respondidas = [...mapa.values()].filter(m => m.alternativa !== null).length;
  const total = intento.preguntas.length;
  const marca = mapa.get(numero);
  useEffect(() => {
    if (numero > 1) document.getElementById('enunciado-rendicion')?.focus();
  }, [numero]);

  if (intento.estado === 'FINALIZADO') {
    return <section className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5" aria-label="Intento finalizado">
      <Estado>El servidor confirmó la finalización. Calificación pendiente de consulta.</Estado>
      {acciones}
      <Link className="enlace" state={{ intentoId: intento.id }} to="/panel/postulante/nota">Ir a Mi nota</Link>
      <Boton className="boton-secundario w-fit" onClick={volver}>Volver a simulacros</Boton>
    </section>;
  }

  return <section className="mt-6 grid gap-5" aria-label="Rendición de simulacro">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div><p className="font-semibold">{modo === 'virtual' ? 'Examen virtual' : 'Ficha impresa'}</p>
        <p className="text-sm">{respondidas} respondidas · {total - respondidas} sin respuesta</p></div>
      <div><p className="text-sm">Tiempo restante</p>
        <p role="timer" aria-label="Tiempo restante" className="text-2xl font-bold tabular-nums">{formatoTiempo(tiempo)}</p></div>
    </div>
    {tiempo <= 0 && <Estado>El plazo terminó. Esperando confirmación del cierre por el servidor.</Estado>}
    {acciones}
    <nav aria-label="Preguntas del simulacro" className="flex flex-wrap gap-2">
      {intento.preguntas.map((p, i) => {
        const estado = mapa.get(i + 1);
        return <Boton key={p.id} type="button" aria-current={numero === i + 1 ? 'step' : undefined}
          aria-label={'Pregunta ' + (i + 1) + ', ' + (estado?.pendiente ? 'sincronización pendiente' : estado?.alternativa ? 'respondida' : 'sin responder')}
          className={numero === i + 1 ? '' : 'boton-secundario'} onClick={() => ir(i + 1)}>
          {i + 1}{estado?.pendiente ? ' · pendiente' : estado?.alternativa ? ' ✓' : ''}
        </Boton>;
      })}
    </nav>
    {pregunta && <div className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5">
      <h2 id="enunciado-rendicion" tabIndex={-1} className="text-lg font-bold">Pregunta {numero} de {total}</h2>
      {modo === 'virtual' && <p className="whitespace-pre-wrap">{pregunta.enunciado}</p>}
      <fieldset disabled={bloqueado || tiempo <= 0} className="grid gap-3">
        <legend className="mb-2 font-semibold">Elige una alternativa</legend>
        {alternativas.map(letra => <label key={letra} className="flex items-center gap-3 rounded-lg border border-slate-300 px-3 py-3">
          <input type="radio" name="respuesta" checked={marca?.alternativa === letra} onChange={() => marcar?.(numero, letra)} />
          <span>{letra}{modo === 'virtual' ? ' · ' + pregunta.alternativas[letra] : ''}</span>
        </label>)}
        <Boton type="button" className="boton-secundario w-fit" disabled={!marca?.alternativa}
          onClick={() => marcar?.(numero, null)}>Quitar respuesta</Boton>
      </fieldset>
    </div>}
    <div className="flex flex-wrap gap-3">
      <Boton className="boton-secundario" onClick={volver}>Volver a simulacros</Boton>
      <Boton className="boton-secundario" disabled={numero <= 1} onClick={() => ir(n => n - 1)}>Pregunta anterior</Boton>
      <Boton className="boton-secundario" disabled={numero >= total} onClick={() => ir(n => n + 1)}>Pregunta siguiente</Boton>
    </div>
  </section>;
}
