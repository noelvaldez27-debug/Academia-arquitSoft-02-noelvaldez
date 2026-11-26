import { useRef, useState, type ReactNode } from 'react';
import { usarSesion } from '../../app/sesion';
import { Boton, Campo, Estado } from '../../compartido/controles';
import { Selector } from '../usuarios/gestion';
import { EditorPregunta } from './editor';
import { banco, textoFallo, usarLectura, type Curso, type Pagina, type Pregunta, type Tema } from './lecturas';

export function Paginador({ pagina, hayMas, seleccionar }: { pagina: number; hayMas: boolean; seleccionar: (numero: number) => void }) {
  return <div className="flex flex-wrap items-center gap-3">
    <Boton type="button" className="boton-secundario" disabled={pagina <= 1} onClick={() => seleccionar(pagina - 1)}>Anterior</Boton>
    <span>Página {pagina}</span>
    <Boton type="button" className="boton-secundario" disabled={!hayMas} onClick={() => seleccionar(pagina + 1)}>Siguiente</Boton>
  </div>;
}

export function ElegirCurso({ elegido, seleccionar, revision = 0 }: { elegido?: Curso; seleccionar: (curso: Curso) => void; revision?: number }) {
  const [pagina, seleccionarPagina] = useState(1);
  const [q, buscar] = useState('');
  const consulta = usarLectura<Pagina<Curso>>(banco + '/cursos?' + new URLSearchParams({ pagina: String(pagina), q }), revision);
  return <section className="grid gap-3" aria-label="Catálogo de cursos">
    <form className="flex flex-wrap items-end gap-3" onSubmit={evento => {
      evento.preventDefault();
      buscar(String(new FormData(evento.currentTarget).get('cursoBuscar')).trim());
      seleccionarPagina(1);
    }}>
      <Campo id="buscar-curso" etiqueta="Buscar curso" name="cursoBuscar" type="search" maxLength={160} />
      <Boton className="boton-secundario">Buscar</Boton>
    </form>
    {!consulta ? <Estado tipo="carga">Cargando cursos…</Estado> : consulta.error ? <Estado tipo="error">{consulta.error}</Estado> : <>
      <Selector nombre="curso" etiqueta="Curso" valor={consulta.datos?.datos.some(c => c.id === elegido?.id) ? elegido?.id : ''}
        vacio="Selecciona un curso" opciones={(consulta.datos?.datos ?? []).map(c => ({ valor: c.id, texto: c.nombre }))}
        onChange={id => { const curso = consulta.datos?.datos.find(c => c.id === id); if (curso) seleccionar(curso); }} />
      {consulta.datos?.datos.length === 0 && <Estado>No hay cursos para esta búsqueda.</Estado>}
      <Paginador pagina={pagina} hayMas={Boolean(consulta.datos?.hayMas)} seleccionar={seleccionarPagina} />
    </>}
    {elegido && <p className="text-sm">Curso seleccionado: <strong>{elegido.nombre}</strong></p>}
  </section>;
}

export function GestionBanco() {
  const { solicitar } = usarSesion();
  const [curso, elegir] = useState<Curso>();
  const [revision, refrescar] = useState(0);
  const [mensaje, avisar] = useState('');
  const [error, fallar] = useState('');
  const activo = useRef(false);
  async function operar(ruta: string, metodo: string, datos?: unknown) {
    if (activo.current) return;
    activo.current = true;
    fallar('');
    try {
      const respuesta = await solicitar<Curso>(ruta, { method: metodo, datos });
      if (ruta === banco + '/cursos') elegir(respuesta);
      refrescar(n => n + 1);
      avisar('Cambios guardados.');
    } catch (e) { fallar(textoFallo(e)); }
    finally { activo.current = false; }
  }
  return <div className="mt-6 grid gap-6">
    {error && <Estado tipo="error">{error}</Estado>}
    {mensaje && <Estado>{mensaje}</Estado>}
    <form className="flex flex-wrap items-end gap-3" onSubmit={e => {
      e.preventDefault();
      void operar(banco + '/cursos', 'POST', { nombre: new FormData(e.currentTarget).get('nombre') });
    }}>
      <Campo id="nuevo-curso" etiqueta="Nombre del curso nuevo" name="nombre" required />
      <Boton>Crear curso</Boton>
    </form>
    <ElegirCurso elegido={curso} seleccionar={elegir} revision={revision} />
    {curso && <PreguntasCurso key={curso.id} curso={curso} revision={revision} operar={operar} />}
  </div>;
}

function PreguntasCurso({ curso, revision, operar }: { curso: Curso; revision: number;
  operar: (ruta: string, metodo: string, datos?: unknown) => Promise<void> }) {
  const { solicitar } = usarSesion();
  const ruta = banco + '/cursos/' + curso.id;
  const temas = usarLectura<Tema[]>(ruta + '/temas', revision);
  const [cambios, refrescar] = useState(0);
  const respuestas = usarLectura<Pregunta[]>(ruta + '/preguntas', revision + cambios);
  const [q, buscar] = useState('');
  const [tema, seleccionarTema] = useState('');
  const [estado, seleccionarEstado] = useState('');
  const [edicion, editar] = useState<Pregunta | 'nueva'>();
  const [seccion, mostrar] = useState<'preguntas' | 'temas' | 'docentes'>('preguntas');
  const [confirmado, confirmar] = useState(false);
  const preguntas = (respuestas?.datos ?? []).filter(p => p.enunciado.toLocaleLowerCase('es').includes(q.toLocaleLowerCase('es').trim())
    && (!tema || p.temaId === tema) && (!estado || p.habilitada === (estado === 'habilitada')));
  const botones: Array<[typeof seccion, string]> = [['preguntas', 'Preguntas'], ['temas', 'Temas'], ['docentes', 'Docentes']];
  return <section className="grid gap-5" aria-label="Gestión del curso">
    <div className="flex flex-wrap gap-3">{botones.map(([id, texto]) => <Boton key={id} type="button" aria-pressed={seccion === id}
      className={seccion === id ? '' : 'boton-secundario'} onClick={() => mostrar(id)}>{texto}</Boton>)}</div>
    {seccion === 'preguntas' && <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo id="buscar-pregunta" etiqueta="Buscar pregunta" type="search" value={q} onChange={e => buscar(e.currentTarget.value)} />
        <Selector nombre="temaFiltro" etiqueta="Tema" vacio="Todos los temas" valor={tema}
          opciones={(temas?.datos ?? []).map(t => ({ valor: t.id, texto: t.nombre }))} onChange={seleccionarTema} />
        <Selector nombre="estadoFiltro" etiqueta="Estado" vacio="Todos los estados" valor={estado} opciones={[
          { valor: 'habilitada', texto: 'Habilitada' }, { valor: 'deshabilitada', texto: 'Deshabilitada' },
        ]} onChange={seleccionarEstado} />
      </div>
      {confirmado && <Estado>Pregunta guardada.</Estado>}
      <Boton className="w-fit" onClick={() => { confirmar(false); editar('nueva'); }}>Nueva pregunta</Boton>
      {edicion && <EditorPregunta key={edicion === 'nueva' ? edicion : edicion.id}
        inicial={edicion === 'nueva' ? undefined : edicion} habilitada={edicion === 'nueva' ? undefined : edicion.habilitada}
        temas={temas?.datos ?? []} cancelar={() => editar(undefined)} guardar={async datos => {
          await solicitar(edicion === 'nueva' ? ruta + '/preguntas' : banco + '/preguntas/' + edicion.id,
            { method: edicion === 'nueva' ? 'POST' : 'PUT', datos });
          editar(undefined); confirmar(true); refrescar(n => n + 1);
        }} />}
      <Resultado lectura={respuestas} vacio={preguntas.length === 0} nombre="preguntas">
        <ul className="grid gap-2">{preguntas.map(p => <li key={p.id} className="panel-acceso flex-wrap">
          <div>{p.enunciado}<p className="text-sm">{p.habilitada ? 'Habilitada' : 'Deshabilitada'} · {p.propuestaId ? 'Propuesta aprobada' : 'Manual'}</p></div>
          {p.propuestaId ? <span className="text-sm">Editar en Separatas</span> :
            <Boton className="boton-secundario" onClick={() => { confirmar(false); editar(p); }}>Editar</Boton>}
        </li>)}</ul>
      </Resultado>
    </>}
    {seccion === 'temas' && <Resultado lectura={temas} vacio={false} nombre="temas">
      <form className="flex flex-wrap items-end gap-3" onSubmit={e => {
        e.preventDefault(); void operar(ruta + '/temas', 'POST', { nombre: new FormData(e.currentTarget).get('nombre') });
      }}><Campo id="nuevo-tema" etiqueta="Tema nuevo" name="nombre" required /><Boton>Crear tema</Boton></form>
      {(temas?.datos ?? []).map(t => <form key={t.id + t.nombre} className="flex flex-wrap items-end gap-3 rounded-xl border p-4" onSubmit={e => {
        e.preventDefault(); void operar(banco + '/temas/' + t.id, 'PUT', { nombre: new FormData(e.currentTarget).get('nombre') });
      }}>
        <Campo id={'tema-' + t.id} etiqueta="Nombre del tema" name="nombre" defaultValue={t.nombre} required />
        <Boton className="boton-secundario">Renombrar</Boton>
        <Boton type="button" className="boton-secundario" onClick={() => {
          if (window.confirm('¿Desactivar este tema?')) void operar(banco + '/temas/' + t.id + '/desactivar', 'PATCH');
        }}>Desactivar</Boton>
      </form>)}
    </Resultado>}
    {seccion === 'docentes' && <Asignaciones ruta={ruta} revision={revision} operar={operar} />}
  </section>;
}

function Asignaciones({ ruta, revision, operar }: { ruta: string; revision: number;
  operar: (ruta: string, metodo: string, datos?: unknown) => Promise<void> }) {
  const [pagina, cambiar] = useState(1);
  const [paginaAsignados, cambiarAsignados] = useState(1);
  const [busqueda, buscar] = useState('');
  const docentes = usarLectura<{ usuarios: { id: string; nombre: string; activo: boolean }[]; total: number; limite: number }>(
    '/api/usuarios?' + new URLSearchParams({ rol: 'DOCENTE', pagina: String(pagina), q: busqueda }));
  const asignados = usarLectura<Pagina<{ id: string }>>(ruta + '/docentes?pagina=' + paginaAsignados, revision);
  const nombres = new Map(docentes?.datos?.usuarios.map(u => [u.id, u.nombre]));
  return <div className="grid gap-4">
    <h2 className="text-lg font-bold">Docentes del curso</h2>
    <Resultado lectura={asignados} vacio={asignados?.datos?.datos.length === 0} nombre="asignaciones">
      <ul className="grid gap-2">{asignados?.datos?.datos.map(d => <li key={d.id} className="panel-acceso">
        {nombres.get(d.id) ?? 'Docente ' + d.id}
        <Boton className="boton-secundario" onClick={() => void operar(ruta + '/docentes/' + d.id, 'DELETE')}>Retirar</Boton>
      </li>)}</ul>
    </Resultado>
    <Paginador pagina={paginaAsignados} hayMas={Boolean(asignados?.datos?.hayMas)} seleccionar={cambiarAsignados} />
    <form className="flex flex-wrap items-end gap-3" onSubmit={evento => {
      evento.preventDefault(); buscar(String(new FormData(evento.currentTarget).get('buscar')).trim()); cambiar(1);
    }}><Campo id="buscar-docente" etiqueta="Buscar docente" type="search" name="buscar" maxLength={160} /><Boton>Buscar</Boton></form>
    <Resultado lectura={docentes} vacio={docentes?.datos?.usuarios.length === 0} nombre="docentes">
      <ul className="grid gap-2">{docentes?.datos?.usuarios.map(d =>
        <li key={d.id} className="panel-acceso">{d.nombre}
          <Boton disabled={!d.activo || asignados?.datos?.datos.some(a => a.id === d.id)} onClick={() =>
            void operar(ruta + '/docentes/' + d.id, 'PUT')}>Asignar</Boton>
        </li>)}</ul>
    </Resultado>
    <Paginador pagina={pagina} hayMas={Boolean(docentes?.datos && pagina * docentes.datos.limite < docentes.datos.total)} seleccionar={cambiar} />
  </div>;
}

export function Resultado({ lectura, nombre, vacio, children }: {
  lectura?: { error?: string }; nombre: string; vacio: boolean; children: ReactNode;
}) {
  if (!lectura) return <Estado tipo="carga">Cargando {nombre}…</Estado>;
  if (lectura.error) return <Estado tipo="error">{lectura.error}</Estado>;
  return vacio ? <Estado>No hay {nombre} para mostrar.</Estado> : <>{children}</>;
}
