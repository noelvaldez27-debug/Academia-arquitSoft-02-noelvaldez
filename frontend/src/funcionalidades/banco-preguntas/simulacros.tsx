import { useRef, useState, type FormEvent } from 'react';
import { usarSesion } from '../../app/sesion';
import { Boton, Campo, Estado } from '../../compartido/controles';
import { Selector } from '../usuarios/gestion';
import { ElegirCurso, Paginador, Resultado } from './banco';
import { banco, textoFallo, usarLectura, type Curso, type Pagina, type Pregunta } from './lecturas';

interface Simulacro { id: string; duracionMinutos: number; preguntas: string[] }
interface Ciclo { id: string; nombre: string; cerradoEn: string | null }

export function GestionSimulacros() {
  const [pagina, cambiarPagina] = useState(1);
  const [revision, refrescar] = useState(0);
  const [actual, editar] = useState<Simulacro>();
  const [versionEditor, reiniciar] = useState(0);
  const lista = usarLectura<Pagina<Simulacro>>(banco + '/simulacros?pagina=' + pagina, revision);
  return <div className="mt-6 grid gap-6">
    <Resultado lectura={lista} vacio={lista?.datos?.datos.length === 0} nombre="simulacros">
      <ul className="grid gap-2">{lista?.datos?.datos.map(s =>
        <li key={s.id} className="panel-acceso flex-wrap">
          <div>{s.duracionMinutos} min · {s.preguntas.length} preguntas <p className="break-all text-xs">{s.id}</p></div>
          <Boton className="boton-secundario" onClick={() => { editar(s); reiniciar(n => n + 1); }}>Editar configuración</Boton>
        </li>)}</ul>
    </Resultado>
    <Paginador pagina={pagina} hayMas={Boolean(lista?.datos?.hayMas)} seleccionar={cambiarPagina} />
    <Boton className="w-fit" onClick={() => { editar(undefined); reiniciar(n => n + 1); }}>Nuevo simulacro</Boton>
    <EditorSimulacro key={versionEditor} actual={actual} guardado={s => { editar(s); refrescar(n => n + 1); }} />
  </div>;
}

function EditorSimulacro({ actual, guardado }: { actual?: Simulacro; guardado: (s: Simulacro) => void }) {
  const { solicitar } = usarSesion();
  const [curso, elegir] = useState<Curso>();
  const [preguntas, ordenar] = useState<string[]>(actual?.preguntas ?? []);
  const [nombres, recordar] = useState<Record<string, string>>({});
  const [error, fallar] = useState('');
  const [exito, avisar] = useState('');
  const [ocupado, ocupar] = useState(false);
  const enviando = useRef(false);
  const seleccion = usarLectura<Pregunta[]>(curso && banco + '/cursos/' + curso.id + '/preguntas');
  const ciclos = usarLectura<Ciclo[]>(actual && '/api/usuarios/ciclos');

  async function operar(accion: () => Promise<void>, confirmacion: string) {
    if (enviando.current) return;
    enviando.current = true;
    ocupar(true); fallar(''); avisar('');
    try { await accion(); avisar(confirmacion); }
    catch (e) { fallar(textoFallo(e)); }
    finally { enviando.current = false; ocupar(false); }
  }

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!preguntas.length) { fallar('Selecciona al menos una pregunta habilitada.'); return; }
    const duracionMinutos = Number(new FormData(e.currentTarget).get('duracion'));
    void operar(async () => {
      const s = await solicitar<Simulacro>(banco + '/simulacros' + (actual ? '/' + actual.id : ''),
        { method: actual ? 'PUT' : 'POST', datos: { duracionMinutos, preguntas } });
      guardado(s);
    }, 'Configuración guardada.');
  }

  function mover(indice: number, destino: number) {
    const copia = [...preguntas];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    ordenar(copia);
  }

  const disponibles = (seleccion?.datos ?? []).filter(p => p.habilitada);
  return <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5" aria-label="Editor de simulacro">
    <h2 className="text-xl font-bold">{actual ? 'Editar simulacro' : 'Configurar simulacro'}</h2>
    {error && <Estado tipo="error">{error}</Estado>}
    {exito && <Estado>{exito}</Estado>}
    <ElegirCurso elegido={curso} seleccionar={elegir} />
    {curso && <Resultado lectura={seleccion} vacio={disponibles.length === 0} nombre="preguntas habilitadas">
      <ul className="grid gap-2">{disponibles.map(p => <li className="panel-acceso flex-wrap" key={p.id}>{p.enunciado}
        <Boton disabled={ocupado || preguntas.includes(p.id)} onClick={() => {
          recordar(anterior => ({ ...anterior, [p.id]: p.enunciado }));
          ordenar(ids => ids.includes(p.id) ? ids : [...ids, p.id]);
        }}>Agregar</Boton>
      </li>)}</ul>
    </Resultado>}
    <form onSubmit={guardar} className="grid gap-4">
      <Campo id="duracion-simulacro" etiqueta="Duración en minutos" name="duracion" type="number" min={1} max={2147483647}
        defaultValue={actual?.duracionMinutos} required />
      <h3 className="font-semibold">Orden de preguntas</h3>
      {preguntas.length === 0 && <Estado>Agrega preguntas de uno o varios cursos.</Estado>}
      <ol className="grid list-decimal gap-3 pl-5">{preguntas.map((id, indice) => <li key={id}>
        <div className="grid gap-2"><span className="break-all">{nombres[id] ?? seleccion?.datos?.find(p => p.id === id)?.enunciado ?? id}</span>
          <div className="flex flex-wrap gap-2">
            <Boton type="button" className="boton-secundario" aria-label={'Subir pregunta ' + (indice + 1)} disabled={indice === 0}
              onClick={() => mover(indice, indice - 1)}>Subir</Boton>
            <Boton type="button" className="boton-secundario" aria-label={'Bajar pregunta ' + (indice + 1)} disabled={indice === preguntas.length - 1}
              onClick={() => mover(indice, indice + 1)}>Bajar</Boton>
            <Boton type="button" className="boton-secundario" aria-label={'Quitar pregunta ' + (indice + 1)}
              onClick={() => ordenar(ids => ids.filter(visible => visible !== id))}>Quitar</Boton>
          </div></div>
      </li>)}</ol>
      <Boton disabled={ocupado}>{ocupado ? 'Procesando…' : 'Guardar configuración'}</Boton>
    </form>
    {actual && <div className="grid gap-3 border-t border-slate-200 pt-4">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={e => {
        e.preventDefault();
        const cicloId = new FormData(e.currentTarget).get('ciclo');
        if (!window.confirm('¿Habilitar el simulacro y congelar el padrón del ciclo seleccionado?')) return;
        void operar(async () => { await solicitar('/api/v1/examenes/simulacros/' + actual.id + '/habilitar',
          { method: 'POST', datos: { cicloId } }); }, 'Padrón confirmado y simulacro habilitado.');
      }}>
        <Selector nombre="ciclo" etiqueta="Ciclo del padrón" requerido vacio="Selecciona un ciclo"
          opciones={(ciclos?.datos ?? []).filter(c => !c.cerradoEn).map(c => ({ valor: c.id, texto: c.nombre }))} />
        <Boton disabled={ocupado || !ciclos?.datos}>Habilitar simulacro</Boton>
      </form>
      {ciclos?.error && <Estado tipo="error">{ciclos.error}</Estado>}
      <Boton className="boton-secundario w-fit" disabled={ocupado} onClick={() => {
        if (!window.confirm('¿Solicitar el cierre general? Se impedirá iniciar intentos nuevos.')) return;
        void operar(async () => { await solicitar('/api/v1/examenes/simulacros/' + actual.id + '/cierre', { method: 'POST' }); },
          'Solicitud de cierre registrada.');
      }}>Solicitar cierre general</Boton>
    </div>}
  </section>;
}
