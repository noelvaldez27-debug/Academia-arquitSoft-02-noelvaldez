import { useEffect, useRef, useState, type FormEvent } from 'react';
import { usarSesion } from '../../app/sesion';
import { Boton, Campo, Estado } from '../../compartido/controles';
import { descargar } from '../../compartido/descargar';
import { Selector } from './gestion';

type EstadoCarga = 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADA' | 'FALLIDA';
interface Ciclo { id: string; nombre: string; cerradoEn: string | null }
interface Resumen { id: string; estado: EstadoCarga; creadaEl: string; propia: boolean }
interface Historial { cargas: Resumen[]; pagina: number; hayMas: boolean }
interface DetalleFila { fila: number; motivo: string }
interface Carga {
  id: string; estado: EstadoCarga; totalFilas: number; creadas: number; recuperadas?: number;
  yaExistian: number; rechazadas: number; errores: DetalleFila[]; avisos: DetalleFila[];
}
const ruta = '/api/usuarios/cargas-masivas';
const etiquetas: Record<EstadoCarga, string> = {
  PENDIENTE: 'Pendiente', PROCESANDO: 'Procesando', COMPLETADA: 'Completada', FALLIDA: 'Fallida',
};
const activa = (estado: EstadoCarga) => estado === 'PENDIENTE' || estado === 'PROCESANDO';
const detalleError = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error al consultar la carga.';
const fecha = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' });

export function CargasExcel() {
  const { solicitar } = usarSesion();
  const [ciclos, guardarCiclos] = useState<Ciclo[]>();
  const [historial, guardarHistorial] = useState<Historial>();
  const [pagina, guardarPagina] = useState(1);
  const [actual, seleccionar] = useState<{ id: string; propia: boolean }>();
  const [detalle, guardarDetalle] = useState<Carga>();
  const [error, avisar] = useState('');
  const [exito, confirmar] = useState('');
  const [revision, refrescar] = useState(0);
  const [reintento, reintentar] = useState(0);
  const [ocupado, ocupar] = useState(false);
  const [entregadas, recordar] = useState<string[]>([]);
  const accion = useRef<AbortController | null>(null);
  useEffect(() => () => accion.current?.abort(), []);

  useEffect(() => {
    const control = new AbortController();
    void solicitar<Ciclo[]>('/api/usuarios/ciclos', { signal: control.signal })
      .then(guardarCiclos).catch(e => { if (!control.signal.aborted) avisar(detalleError(e)); });
    return () => control.abort();
  }, [solicitar]);

  useEffect(() => {
    const control = new AbortController();
    guardarHistorial(undefined);
    void solicitar<Historial>(ruta + '?pagina=' + pagina, { signal: control.signal })
      .then(guardarHistorial).catch(e => { if (!control.signal.aborted) avisar(detalleError(e)); });
    return () => control.abort();
  }, [solicitar, pagina, revision]);

  useEffect(() => {
    if (!actual) return;
    const control = new AbortController();
    let temporizador: ReturnType<typeof setTimeout>;
    const consultar = async () => {
      try {
        const carga = await solicitar<Carga>(ruta + '/' + actual.id, { signal: control.signal });
        if (control.signal.aborted) return;
        guardarDetalle(carga);
        if (activa(carga.estado)) temporizador = setTimeout(consultar, 3000);
      } catch (e) {
        if (!control.signal.aborted) avisar(detalleError(e));
      }
    };
    void consultar();
    return () => { control.abort(); clearTimeout(temporizador); };
  }, [actual, solicitar, reintento]);

  async function operar(atrabajar: (signal: AbortSignal) => Promise<void>) {
    if (accion.current) return;
    const control = new AbortController();
    accion.current = control;
    ocupar(true);
    avisar('');
    confirmar('');
    try { await atrabajar(control.signal); }
    catch (e) { if (!control.signal.aborted) avisar(detalleError(e)); }
    finally { accion.current = null; if (!control.signal.aborted) ocupar(false); }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (accion.current) return;
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    const archivo = datos.get('archivo');
    if (!(archivo instanceof File) || !archivo.size || !/\.xlsx$/i.test(archivo.name)) {
      avisar('Selecciona un archivo .xlsx con contenido.');
      return;
    }
    const ciclo = datos.get('cicloId');
    if (!window.confirm(ciclo
      ? 'La importación puede reactivar estudiantes archivados que pertenezcan a tu alcance. ¿Continuar?'
      : 'La importación registrará estudiantes nuevos y omitirá los DNI existentes. ¿Continuar?')) return;
    const cuerpo = new FormData();
    cuerpo.append('archivo', archivo);
    void operar(async signal => {
      const creada = await solicitar<{ id: string }>(ruta + (ciclo ? '?cicloId=' + encodeURIComponent(String(ciclo)) : ''), {
        method: 'POST', datos: cuerpo, signal,
      });
      if (signal.aborted) return;
      guardarDetalle(undefined);
      seleccionar({ id: creada.id, propia: true });
      guardarPagina(1);
      refrescar(n => n + 1);
      formulario.reset();
      confirmar('Archivo recibido. El procesamiento se ejecuta en segundo plano.');
    });
  }

  return <div className="mt-6 grid gap-6">
    {error && <Estado tipo="error">{error}</Estado>}
    {exito && <Estado>{exito}</Estado>}
    <form className="grid max-w-xl gap-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={enviar}>
      <h2 className="text-lg font-bold">Importar estudiantes</h2>
      <Campo id="archivo-estudiantes" etiqueta="Archivo Excel (.xlsx)" name="archivo" type="file" accept=".xlsx" required />
      <Selector nombre="cicloId" etiqueta="Modalidad de importación" vacio="Normal · solo altas"
        opciones={(ciclos ?? []).filter(c => !c.cerradoEn).map(c => ({ valor: c.id, texto: 'Nuevo ciclo · ' + c.nombre }))} />
      <Boton disabled={ocupado} type="submit">{ocupado ? 'Procesando solicitud…' : 'Enviar archivo'}</Boton>
    </form>
    {actual && <section className="grid gap-3" aria-label="Detalle de carga">
      <h2 className="text-lg font-bold">Estado de la carga</h2>
      {!detalle && !error && <Estado tipo="carga">Consultando estado…</Estado>}
      {error && <Boton className="boton-secundario" onClick={() => { avisar(''); reintentar(n => n + 1); }}>Reintentar consulta</Boton>}
      {detalle && <>
        <Estado tipo={detalle.estado === 'FALLIDA' ? 'error' : 'info'}>{etiquetas[detalle.estado]}</Estado>
        <dl className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <div><dt>Filas recibidas</dt><dd>{detalle.totalFilas}</dd></div>
          <div><dt>Creadas</dt><dd>{detalle.creadas}</dd></div>
          <div><dt>Recuperadas</dt><dd>{detalle.recuperadas ?? 0}</dd></div>
          <div><dt>Ya existentes</dt><dd>{detalle.yaExistian}</dd></div>
          <div><dt>Rechazadas</dt><dd>{detalle.rechazadas}</dd></div>
        </dl>
        {([{ titulo: 'Errores', filas: detalle.errores }, { titulo: 'Advertencias', filas: detalle.avisos }]).map(grupo =>
          grupo.filas.length > 0 && <div key={grupo.titulo}><h3 className="font-semibold">{grupo.titulo}</h3>
            <ul className="list-disc space-y-1 pl-5">{grupo.filas.map((f, indice) => <li key={indice}>Fila {f.fila} · {f.motivo}</li>)}</ul>
          </div>)}
        {detalle.estado === 'COMPLETADA' && actual.propia && detalle.creadas + (detalle.recuperadas ?? 0) > 0 &&
          !entregadas.includes(actual.id) && <Boton disabled={ocupado} onClick={() => void operar(async signal => {
            const blob = await solicitar<Blob>(ruta + '/' + actual.id + '/credenciales', { method: 'POST', formato: 'archivo', signal });
            if (signal.aborted) return;
            descargar(blob, 'credenciales-provisionales.xlsx');
            recordar(ids => [...ids, actual.id]);
            confirmar('Archivo de credenciales descargado.');
          })}>Descargar credenciales de un solo uso</Boton>}
      </>}
    </section>}
    <section className="grid gap-3" aria-label="Historial de cargas">
      <h2 className="text-lg font-bold">Historial de cargas</h2>
      {!historial && !error && <Estado tipo="carga">Cargando historial…</Estado>}
      {historial && historial.cargas.length === 0 && <Estado>No hay cargas en esta página.</Estado>}
      {historial && <ul className="grid gap-2">{historial.cargas.map(c =>
        <li key={c.id}><button type="button" className="panel-acceso w-full text-left" aria-pressed={actual?.id === c.id} onClick={() => {
          avisar('');
          if (actual?.id === c.id) { reintentar(n => n + 1); return; }
          guardarDetalle(undefined);
          seleccionar({ id: c.id, propia: c.propia });
        }}>{fecha.format(new Date(c.creadaEl))} <span>{etiquetas[c.estado]}</span></button></li>)}</ul>}
      <div className="flex flex-wrap gap-2">
        <Boton className="boton-secundario" disabled={pagina === 1} onClick={() => guardarPagina(n => n - 1)}>Anterior</Boton>
        <Boton className="boton-secundario" disabled={!historial?.hayMas} onClick={() => guardarPagina(n => n + 1)}>Siguiente</Boton>
        <Boton className="boton-secundario" onClick={() => { avisar(''); refrescar(n => n + 1); }}>Actualizar historial</Boton>
      </div>
    </section>
  </div>;
}
