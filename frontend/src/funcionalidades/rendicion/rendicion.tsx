import { useEffect, useRef, useState } from 'react';
import { usarSesion } from '../../app/sesion';
import { Boton, Estado } from '../../compartido/controles';
import { usarLectura, textoFallo } from '../banco-preguntas/lecturas';
import { examenes, type Intento, type Modo, type Opcion, type Reloj } from './contratos';
import { IntentoSincronizado } from './intento-sincronizado';

const estados = { DISPONIBLE: 'Disponible', EN_CURSO: 'En curso', FINALIZADO: 'Finalizado' } as const;

export function Rendicion() {
  const { solicitar } = usarSesion();
  const [opcion, elegir] = useState<Opcion>();
  const [modo, cambiarModo] = useState<Modo>('virtual');
  const [origen, abrir] = useState<Reloj>();
  const [error, fallar] = useState('');
  const [revision, refrescar] = useState(0);
  const [ocupado, ocupar] = useState(false);
  const carga = useRef<AbortController | null>(null);
  const listado = usarLectura<Opcion[]>(origen ? undefined : examenes + '/simulacros', revision);
  useEffect(() => () => carga.current?.abort(), []);

  async function entrar(seleccion: Opcion) {
    if (carga.current) return;
    const control = new AbortController();
    carga.current = control;
    ocupar(true);
    fallar('');
    const recibidoEn = performance.now();
    try {
      const intento = seleccion.intentoId
        ? await solicitar<Intento>(examenes + '/' + seleccion.intentoId, { signal: control.signal })
        : await solicitar<Intento>(examenes + '/iniciar', {
          method: 'POST', datos: { simulacroId: seleccion.simulacroId }, signal: control.signal,
        });
      if (!control.signal.aborted) abrir({ intento, recibidoEn });
    } catch (e) { if (!control.signal.aborted) fallar(textoFallo(e)); }
    finally { carga.current = null; if (!control.signal.aborted) ocupar(false); }
  }

  function volver() {
    abrir(undefined); elegir(undefined); fallar(''); refrescar(n => n + 1);
  }

  if (origen) return <IntentoSincronizado key={origen.intento.id} inicial={origen} modo={modo} volver={volver} />;

  return <div className="mt-6 grid gap-5">
    {error && <Estado tipo="error">{error}</Estado>}
    {!listado && <Estado tipo="carga">Cargando simulacros…</Estado>}
    {listado?.error && <Estado tipo="error">{listado.error}</Estado>}
    {listado?.datos?.length === 0 && <Estado>No tienes simulacros habilitados ni intentos previos.</Estado>}
    {listado?.datos && <ul className="grid gap-3">{listado.datos.map(s => <li key={s.simulacroId} className="panel-acceso flex-wrap">
      <div><strong>{estados[s.estado]}</strong>
        {s.habilitadoEn && <p className="text-sm">Habilitado el {new Date(s.habilitadoEn).toLocaleDateString('es-PE')}</p>}
        <p className="break-all text-xs">Referencia {s.simulacroId}</p></div>
      <Boton className="boton-secundario" disabled={ocupado} onClick={() => { elegir(s); fallar(''); }}>
        {s.estado === 'DISPONIBLE' ? 'Ver instrucciones' : s.estado === 'EN_CURSO' ? 'Reanudar intento' : 'Ver finalización'}
      </Boton>
    </li>)}</ul>}
    {opcion && <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5" aria-label="Instrucciones del simulacro">
      <h2 className="text-xl font-bold">Instrucciones del simulacro</h2>
      <p>Tienes un intento por simulacro. El servidor fija el plazo y confirma el cierre.</p>
      <p>En el examen virtual verás los enunciados. Si tienes el examen impreso, usa la ficha para registrar las letras en el orden indicado.</p>
      <fieldset className="flex flex-wrap gap-4"><legend className="font-semibold">Modalidad</legend>
        <label><input type="radio" name="modalidad" checked={modo === 'virtual'} onChange={() => cambiarModo('virtual')} /> Virtual</label>
        <label><input type="radio" name="modalidad" checked={modo === 'impreso'} onChange={() => cambiarModo('impreso')} /> Ficha impresa</label>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Boton disabled={ocupado} onClick={() => void entrar(opcion)}>{ocupado ? 'Abriendo intento…'
          : opcion.estado === 'DISPONIBLE' ? 'Comenzar simulacro' : 'Abrir intento'}</Boton>
        <Boton className="boton-secundario" disabled={ocupado} onClick={() => { elegir(undefined); fallar(''); }}>Cancelar</Boton>
      </div>
    </section>}
    <Boton className="boton-secundario w-fit" disabled={ocupado} onClick={volver}>Actualizar listado</Boton>
  </div>;
}
