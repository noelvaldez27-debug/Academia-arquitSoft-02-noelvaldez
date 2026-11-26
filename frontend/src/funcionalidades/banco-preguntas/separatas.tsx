import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usarSesion } from '../../app/sesion';
import { Boton, Campo, Estado } from '../../compartido/controles';
import { descargar } from '../../compartido/descargar';
import { Selector } from '../usuarios/gestion';
import { ElegirCurso, Paginador, Resultado } from './banco';
import { EditorPregunta } from './editor';
import { banco, letras, textoFallo, usarLectura, type Contenido, type Curso, type Pagina, type Tema } from './lecturas';

const estados = {
  SUBIDA: 'Recibida',
  EN_EXTRACCION: 'Extrayendo contenido',
  TEXTO_EXTRAIDO: 'Texto extraído',
  PREGUNTAS_PROPUESTAS: 'Propuestas disponibles',
  ERROR_EXTRACCION: 'Error de procesamiento',
} as const;
const estadosPropuesta = { PROPUESTA: 'Pendiente de revisión', APROBADA: 'Aprobada', RECHAZADA: 'Descartada' } as const;

interface Resumen { id: string; cursoId: string; estado: keyof typeof estados; mime: string }
interface Propuesta extends Contenido { id: string; estado: keyof typeof estadosPropuesta }
interface Detalle extends Omit<Resumen, 'mime'> {
  motivo: string | null;
  propuestas: Propuesta[];
  autorizacion: { estado: 'AUTORIZADA' | 'REVOCADA'; alcance: string[] } | null;
}

export function GestionSeparatas() {
  const { solicitar, sesion } = usarSesion();
  const docente = sesion?.perfil === 'docente';
  const [curso, seleccionar] = useState<Curso>();
  const [estado, filtrar] = useState('');
  const [pagina, cambiarPagina] = useState(1);
  const [id, abrir] = useState<string>();
  const [revision, refrescar] = useState(0);
  const [ocupado, ocupar] = useState(false);
  const [error, fallar] = useState('');
  const pendiente = useRef<AbortController | null>(null);
  useEffect(() => () => pendiente.current?.abort(), []);
  const ruta = banco + '/separatas';
  const consulta = usarLectura<Pagina<Resumen>>(ruta + '?' + new URLSearchParams({
    pagina: String(pagina), cursoId: curso?.id ?? '', estado,
  }), revision);

  async function subir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (pendiente.current || !curso) return;
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    const archivo = datos.get('archivo');
    if (!(archivo instanceof File) || !archivo.size || !/\.(docx|pdf|jpe?g|png)$/i.test(archivo.name)) {
      fallar('Adjunta un archivo DOCX, PDF, JPG, JPEG o PNG válido.');
      return;
    }
    const control = new AbortController();
    pendiente.current = control;
    ocupar(true);
    fallar('');
    try {
      const recibida = await solicitar<{ id: string }>(banco + '/cursos/' + curso.id + '/separatas', {
        method: 'POST', datos, signal: control.signal,
      });
      if (!control.signal.aborted) {
        abrir(recibida.id); refrescar(n => n + 1); formulario.reset();
      }
    } catch (e) { if (!control.signal.aborted) fallar(textoFallo(e)); }
    finally { pendiente.current = null; if (!control.signal.aborted) ocupar(false); }
  }

  return <div className="mt-6 grid gap-6">
    {error && <Estado tipo="error">{error}</Estado>}
    <ElegirCurso elegido={curso} seleccionar={c => { seleccionar(c); cambiarPagina(1); }} />
    {curso && <Boton className="boton-secundario w-fit" onClick={() => { seleccionar(undefined); cambiarPagina(1); }}>
      Ver separatas de todos los cursos
    </Boton>}
    {docente && <form className="grid max-w-xl gap-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={subir}>
      <h2 className="text-lg font-bold">Subir separata</h2>
      {!curso && <Estado>Selecciona el curso antes de subir el archivo.</Estado>}
      <Campo id="archivo-separata" name="archivo" etiqueta="Archivo DOCX, PDF, JPG, JPEG o PNG" type="file"
        accept=".docx,.pdf,.jpg,.jpeg,.png" required />
      <Boton disabled={ocupado || !curso}>{ocupado ? 'Enviando…' : 'Subir separata'}</Boton>
    </form>}
    {id && <RevisionSeparata key={id} id={id} docente={docente} cerrar={() => { abrir(undefined); refrescar(n => n + 1); }} />}
    <section className="grid gap-4" aria-label="Historial de separatas">
      <h2 className="text-xl font-bold">Historial de separatas</h2>
      <Selector nombre="estadoSeparata" etiqueta="Estado de procesamiento" vacio="Todos los estados"
        opciones={Object.entries(estados).map(([valor, texto]) => ({ valor, texto }))} valor={estado}
        onChange={valor => { filtrar(valor); cambiarPagina(1); }} />
      <Resultado lectura={consulta} vacio={consulta?.datos?.datos.length === 0} nombre="separatas">
        <ul className="grid gap-2">{consulta?.datos?.datos.map(s => <li key={s.id} className="panel-acceso flex-wrap">
          <div>{estados[s.estado]}<p className="break-all text-xs">{s.id} · {s.mime}</p></div>
          <Boton className="boton-secundario" onClick={() => abrir(s.id)}>Revisar separata</Boton>
        </li>)}</ul>
      </Resultado>
      <Paginador pagina={pagina} hayMas={Boolean(consulta?.datos?.hayMas)} seleccionar={cambiarPagina} />
      <Boton className="boton-secundario w-fit" onClick={() => refrescar(n => n + 1)}>Actualizar historial</Boton>
    </section>
  </div>;
}

function RevisionSeparata({ id, docente, cerrar }: { id: string; docente: boolean; cerrar: () => void }) {
  const { solicitar } = usarSesion();
  const [detalle, guardar] = useState<Detalle>();
  const [revision, refrescar] = useState(0);
  const [error, fallar] = useState('');
  const [mensaje, avisar] = useState('');
  const [editada, editar] = useState<Propuesta>();
  const [ocupado, ocupar] = useState(false);
  const pendiente = useRef(false);
  const ruta = banco + '/separatas/' + id;
  const temas = usarLectura<Tema[]>(detalle && banco + '/cursos/' + detalle.cursoId + '/temas');

  useEffect(() => {
    const control = new AbortController();
    let reloj: ReturnType<typeof setTimeout>;
    let intentos = 0;
    const consultar = async () => {
      intentos++;
      try {
        const resultado = await solicitar<Detalle>(ruta, { signal: control.signal });
        if (control.signal.aborted) return;
        guardar(resultado);
        const alcance = resultado.autorizacion?.estado === 'AUTORIZADA' ? resultado.autorizacion.alcance : [];
        const procesando = resultado.estado === 'EN_EXTRACCION'
          || (resultado.estado === 'SUBIDA' && (!resultado.motivo || alcance.includes('adjunto')))
          || (resultado.estado === 'TEXTO_EXTRAIDO' && alcance.includes('texto'));
        if (procesando && intentos < 30) {
          reloj = setTimeout(consultar, 3000);
        }
      } catch (e) { if (!control.signal.aborted) fallar(textoFallo(e)); }
    };
    void consultar();
    return () => { control.abort(); clearTimeout(reloj); };
  }, [solicitar, ruta, revision]);

  async function operar(accion: () => Promise<void>, texto: string) {
    if (pendiente.current) return;
    pendiente.current = true; ocupar(true); fallar(''); avisar('');
    try { await accion(); avisar(texto); refrescar(n => n + 1); }
    catch (e) { fallar(textoFallo(e)); }
    finally { pendiente.current = false; ocupar(false); }
  }

  function autorizar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const alcance = datos.getAll('alcance');
    if (!alcance.length || !datos.has('contenidoApto')) { fallar('Confirma los permisos y selecciona el alcance.'); return; }
    void operar(async () => {
      await solicitar(ruta + '/autorizacion', { method: 'PUT', datos: { estado: 'AUTORIZADA', alcance, contenidoApto: true } });
    }, 'Autorización registrada.');
  }

  return <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5" aria-label="Revisión de separata">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Revisión de separata</h2>
      <Boton className="boton-secundario" onClick={cerrar}>Cerrar revisión</Boton></div>
    {error && <Estado tipo="error">{error}</Estado>}
    {mensaje && <Estado>{mensaje}</Estado>}
    {!detalle && !error && <Estado tipo="carga">Consultando separata…</Estado>}
    <Boton className="boton-secundario w-fit" onClick={() => { fallar(''); refrescar(n => n + 1); }}>Actualizar estado</Boton>
    {detalle && <>
      <Estado tipo={detalle.estado === 'ERROR_EXTRACCION' ? 'error' : 'info'}>{estados[detalle.estado]}</Estado>
      {detalle.estado !== 'PREGUNTAS_PROPUESTAS' && detalle.motivo && <p className="text-sm">{detalle.motivo}</p>}
      <p>Transferencia: <strong>{detalle.autorizacion?.estado === 'AUTORIZADA'
        ? 'Autorizada · ' + detalle.autorizacion.alcance.join(', ') : detalle.autorizacion ? 'Revocada' : 'Pendiente de autorización'}</strong></p>
      <Boton className="boton-secundario w-fit" disabled={ocupado} onClick={() => void operar(async () => {
        const archivo = await solicitar<Blob>(ruta + '/archivo', { formato: 'archivo' });
        const formato = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' }[archivo.type];
        descargar(archivo, 'separata.' + (formato ?? 'bin'));
      }, 'Descarga solicitada.')}>Descargar original</Boton>
      {!docente && <form className="grid gap-3 rounded-xl border border-slate-200 p-4" onSubmit={autorizar}>
        <h3 className="font-semibold">Autorización de transferencia externa</h3>
        <label className="flex gap-2"><input type="checkbox" name="contenidoApto" required />
          Verifiqué los permisos y que el contenido está libre de datos personales, credenciales e información confidencial.</label>
        <label className="flex gap-2"><input type="checkbox" name="alcance" value="texto" /> Texto extraído</label>
        <label className="flex gap-2"><input type="checkbox" name="alcance" value="adjunto" /> Archivo adjunto</label>
        <div className="flex flex-wrap gap-3">
          <Boton disabled={ocupado}>Autorizar transferencia</Boton>
          {detalle.autorizacion?.estado === 'AUTORIZADA' && <Boton type="button" className="boton-secundario" disabled={ocupado}
            onClick={() => void operar(async () => { await solicitar(ruta + '/autorizacion',
              { method: 'PUT', datos: { estado: 'REVOCADA' } }); }, 'Autorización revocada.')}>Revocar autorización</Boton>}
        </div>
      </form>}
      <h3 className="text-lg font-bold">Preguntas propuestas</h3>
      {detalle.propuestas.length === 0 && <Estado>Todavía no hay propuestas para revisar.</Estado>}
      {temas?.error && <Estado tipo="error">{temas.error}</Estado>}
      <ul className="grid gap-3">{detalle.propuestas.map(p => <li key={p.id} className="grid gap-3 rounded-xl border border-slate-200 p-4">
        <div><strong>{p.enunciado}</strong><p className="text-sm">{estadosPropuesta[p.estado]}</p></div>
        <dl className="grid gap-2">{letras.map(l => <div className="flex flex-wrap gap-2" key={l}>
          <dt>{l}</dt><dd>{p.alternativas[l]} {p.correcta === l && <strong>· Correcta</strong>}</dd></div>)}</dl>
        {editada?.id === p.id ? <EditorPregunta inicial={editada} temas={temas?.datos ?? []} cancelar={() => editar(undefined)}
          guardar={async datos => {
            await solicitar(banco + '/propuestas/' + p.id, { method: 'PUT', datos });
            editar(undefined); avisar('Propuesta corregida. Requiere validación docente.'); refrescar(n => n + 1);
          }} /> : <div className="flex flex-wrap gap-2">
          {p.estado !== 'RECHAZADA' && <Boton className="boton-secundario" disabled={ocupado} onClick={() => editar(p)}>Corregir</Boton>}
          {p.estado === 'PROPUESTA' && <>
            {docente && <Boton disabled={ocupado} onClick={() => void operar(async () => {
              await solicitar(banco + '/propuestas/' + p.id + '/aprobar', { method: 'POST' });
            }, 'Propuesta aprobada.')}>Aprobar</Boton>}
            <Boton className="boton-secundario" disabled={ocupado} onClick={() => {
              if (window.confirm('¿Descartar esta propuesta?')) void operar(async () => {
                await solicitar(banco + '/propuestas/' + p.id + '/descartar', { method: 'POST' });
              }, 'Propuesta descartada.');
            }}>Descartar</Boton>
          </>}
        </div>}
      </li>)}</ul>
    </>}
  </section>;
}
