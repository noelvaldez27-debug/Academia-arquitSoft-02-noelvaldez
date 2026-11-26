import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { usarSesion } from '../../app/sesion';
import { Boton, Estado } from '../../compartido/controles';
import { ErrorApi } from '../../compartido/cliente-rest';
import { colaLocal, type Operacion } from './cola-local';
import { examenes, restante, type Alternativa, type Intento, type Marca, type Modo, type Reloj } from './contratos';
import { VistaIntento, type MarcaVisible } from './vista-intento';

const advertencia = 'Hay respuestas pendientes en este dispositivo. Se conservarán hasta 24 horas, pero el plazo del examen no se amplía. ¿Quieres salir?';
const errorLocal = 'No se pudo acceder al almacenamiento del dispositivo. Revisa la configuración y vuelve a abrir el intento.';

export function IntentoSincronizado({ inicial, modo, volver }: { inicial: Reloj; modo: Modo; volver: () => void }) {
  const { sesion, solicitar, configurarSalida } = usarSesion();
  const estudiante = sesion!.id;
  const id = inicial.intento.id;
  const ruta = examenes + '/' + id;
  const [origen, mostrar] = useState(inicial);
  const ultima = useRef(inicial);
  const [cola, mostrarCola] = useState<Operacion[]>([]);
  const [lista, preparada] = useState(false);
  const [almacenError, fallarAlmacen] = useState(false);
  const [online, conectar] = useState(navigator.onLine);
  const [ocupado, ocupar] = useState(false);
  const [escribiendo, escribir] = useState(false);
  const escritura = useRef(false);
  const trabajando = useRef(false);
  const [error, fallar] = useState('');
  const [conflicto, conciliar] = useState<number>();
  const [pausa, pausar] = useState<'red' | 'manual'>();
  const [sinConfirmarAlCerrar, contarCierre] = useState(0);
  const vigente = useRef<AbortController | null>(null);

  const aplicar = useCallback((siguiente: Reloj) => {
    ultima.current = siguiente;
    mostrar(siguiente);
  }, []);

  const leerCola = useCallback(async () => {
    try {
      const operaciones = await colaLocal.listar(estudiante, id);
      mostrarCola(operaciones);
      return operaciones;
    } catch {
      fallarAlmacen(true);
      throw new Error(errorLocal);
    }
  }, [estudiante, id]);

  useEffect(() => {
    const control = new AbortController();
    vigente.current = control;
    void leerCola().then(async operaciones => {
      if (control.signal.aborted) return;
      if (ultima.current.intento.estado === 'FINALIZADO') {
        contarCierre(operaciones.length);
        await colaLocal.limpiar(estudiante, id);
        mostrarCola([]);
      }
      preparada(true);
    }).catch(() => { if (!control.signal.aborted) fallarAlmacen(true); });
    const estadoRed = () => {
      conectar(navigator.onLine);
      if (navigator.onLine) pausar(anterior => anterior === 'red' ? undefined : anterior);
    };
    window.addEventListener('online', estadoRed);
    window.addEventListener('offline', estadoRed);
    return () => {
      control.abort();
      vigente.current = null;
      window.removeEventListener('online', estadoRed);
      window.removeEventListener('offline', estadoRed);
    };
  }, [estudiante, id, leerCola]);

  useEffect(() => {
    if (!cola.length) return;
    const caduca = Math.min(...cola.map(op => op.caduca));
    const reloj = setTimeout(() => { void leerCola().catch(() => undefined); }, Math.max(0, caduca - Date.now()));
    return () => clearTimeout(reloj);
  }, [cola, leerCola]);

  const pendientes = cola.length > 0 || escribiendo;
  const bloqueo = useBlocker(pendientes && origen.intento.estado === 'ACTIVO');
  useEffect(() => {
    if (bloqueo.state !== 'blocked') return;
    if (window.confirm(advertencia)) bloqueo.proceed();
    else bloqueo.reset();
  }, [bloqueo]);
  useEffect(() => {
    if (!pendientes || origen.intento.estado === 'FINALIZADO') return;
    const retiro = configurarSalida(() => window.confirm(advertencia));
    const cerrar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', cerrar);
    return () => { retiro(); window.removeEventListener('beforeunload', cerrar); };
  }, [pendientes, configurarSalida, origen.intento.estado]);

  const recuperar = useCallback(async (signal: AbortSignal) => {
    const recibidoEn = performance.now();
    const intento = await solicitar<Intento>(ruta, { signal });
    if (!signal.aborted) aplicar({ intento, recibidoEn });
    if (!signal.aborted && intento.estado === 'FINALIZADO') {
      const anteriores = await leerCola();
      contarCierre(anteriores.length);
      await colaLocal.limpiar(estudiante, id);
      mostrarCola([]);
      conciliar(undefined);
    }
    return intento;
  }, [aplicar, estudiante, id, leerCola, ruta, solicitar]);

  async function marcar(numero: number, alternativa: Alternativa | null) {
    if (!lista || almacenError || escritura.current || conflicto || trabajando.current
      || ultima.current.intento.estado !== 'ACTIVO' || restante(ultima.current) <= 0) return;
    escritura.current = true;
    escribir(true);
    try {
      const revision = ultima.current.intento.respuestas.find(m => m.numero === numero)?.revision ?? 0;
      mostrarCola(await colaLocal.agregar(estudiante, id, numero, alternativa, revision));
      pausar(anterior => anterior === 'manual' ? anterior : undefined);
    } catch { fallarAlmacen(true); }
    finally { escritura.current = false; escribir(false); }
  }

  const sincronizar = useCallback(async () => {
    if (trabajando.current || escritura.current || !navigator.onLine || !vigente.current) return;
    const signal = vigente.current.signal;
    trabajando.current = true; ocupar(true); fallar('');
    try {
      const actual = await recuperar(signal);
      if (signal.aborted || actual.estado !== 'ACTIVO' || restante(ultima.current) <= 0 || conflicto) return;
      const operaciones = await leerCola();
      for (const op of operaciones) {
        if (signal.aborted || !navigator.onLine || restante(ultima.current) <= 0) break;
        if (op.caduca <= Date.now()) { await colaLocal.quitar(op.orden); continue; }
        try {
          const { numero, alternativa, revisionBase, operacionId } = op;
          const respuesta = await solicitar<Marca>(ruta + '/respuestas', {
            method: 'PUT', datos: { numero, alternativa, revisionBase, operacionId }, signal,
          });
          if (signal.aborted) break;
          const previo = ultima.current;
          const existente = previo.intento.respuestas.find(m => m.numero === numero);
          if (!existente || existente.revision <= respuesta.revision) aplicar({
            ...previo, intento: { ...previo.intento,
              respuestas: [...previo.intento.respuestas.filter(m => m.numero !== numero), respuesta] },
          });
          await colaLocal.quitar(op.orden);
        } catch (e) {
          if (signal.aborted) return;
          if (!(e instanceof ErrorApi) || e.estado !== 409) throw e;
          const servidor = await recuperar(signal);
          if (servidor.estado === 'ACTIVO' && restante(ultima.current) > 0) conciliar(op.numero);
          return;
        }
      }
      await leerCola();
      pausar(undefined);
    } catch (e) {
      if (!signal.aborted) {
        pausar(e instanceof ErrorApi && (e.estado === 0 || e.estado >= 500) ? 'red' : 'manual');
        fallar(e instanceof Error ? e.message : 'Error al sincronizar el intento.');
      }
    } finally {
      trabajando.current = false;
      if (!signal.aborted) ocupar(false);
    }
  }, [aplicar, conflicto, leerCola, recuperar, ruta, solicitar]);

  useEffect(() => {
    if (!lista || !online || ocupado || escribiendo || conflicto || almacenError || !cola.length
      || origen.intento.estado === 'FINALIZADO' || restante(origen) <= 0 || pausa) return;
    void sincronizar();
  }, [lista, online, ocupado, escribiendo, conflicto, almacenError, cola, origen, pausa, sincronizar]);

  useEffect(() => {
    if (!online || !lista || origen.intento.estado === 'FINALIZADO') return;
    const reloj = setInterval(() => {
      if (restante(ultima.current) <= 0 && pausa !== 'manual') void sincronizar();
    }, 2000);
    return () => clearInterval(reloj);
  }, [online, lista, origen.intento.estado, pausa, sincronizar]);

  useEffect(() => {
    if (!online || pausa !== 'red' || almacenError) return;
    const reloj = setTimeout(() => void sincronizar(), 5000);
    return () => clearTimeout(reloj);
  }, [online, pausa, almacenError, ocupado, sincronizar]);

  async function usarMarcaServidor() {
    if (!conflicto || trabajando.current) return;
    try {
      await colaLocal.limpiar(estudiante, id, conflicto);
      await leerCola();
      conciliar(undefined); fallar(''); pausar(undefined);
    } catch { fallarAlmacen(true); }
  }

  async function finalizar() {
    if (trabajando.current || escritura.current || !online || !lista || almacenError || !vigente.current) return;
    if (restante(ultima.current) <= 0) { void sincronizar(); return; }
    if (cola.length) { fallar('Sincroniza las respuestas pendientes antes de finalizar.'); return; }
    if (!window.confirm('¿Finalizar el intento? Después de confirmar ya no podrás editar tus respuestas.')) return;
    const signal = vigente.current.signal;
    trabajando.current = true; ocupar(true); fallar('');
    try {
      const pendientesServidor = await leerCola();
      if (pendientesServidor.length) { fallar('Sincroniza las respuestas pendientes antes de finalizar.'); return; }
      const cierre = await solicitar<Pick<Intento, 'cierre' | 'estado'>>(ruta + '/finalizar', { method: 'POST', signal });
      if (!signal.aborted) {
        const anterior = ultima.current;
        aplicar({ ...anterior, intento: { ...anterior.intento, ...cierre, tiempoRestanteMs: 0 } });
        await colaLocal.limpiar(estudiante, id);
        mostrarCola([]);
      }
    } catch (e) { if (!signal.aborted) fallar(e instanceof Error ? e.message : 'No se pudo confirmar el cierre.'); }
    finally { trabajando.current = false; if (!signal.aborted) ocupar(false); }
  }

  const marcas = new Map<number, MarcaVisible>(origen.intento.respuestas.map(r => [r.numero, r]));
  for (const op of cola) marcas.set(op.numero, { numero: op.numero, alternativa: op.alternativa, pendiente: true });
  const acciones = origen.intento.estado === 'FINALIZADO'
    ? <div className="grid gap-2">
        {sinConfirmarAlCerrar > 0 && <Estado>Quedaron {sinConfirmarAlCerrar} operaciones sin confirmación local al cerrar.</Estado>}
      </div>
    : <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p><strong>{online ? 'Con conexión' : 'Sin conexión'}</strong> · {origen.intento.respuestas.filter(m => m.alternativa !== null).length} respuestas confirmadas · {cola.length} operaciones pendientes</p>
      {!lista && !almacenError && <Estado tipo="carga">Revisando respuestas guardadas en este dispositivo…</Estado>}
      {almacenError && <Estado tipo="error">{errorLocal}</Estado>}
      {error && <Estado tipo="error">{error}</Estado>}
      {conflicto && <div className="grid gap-2"><Estado>La pregunta {conflicto} tiene una revisión distinta en el servidor.
        Puedes conservar la versión confirmada y, si queda tiempo, volver a marcar.</Estado>
        <Boton className="boton-secundario w-fit" onClick={() => void usarMarcaServidor()}>Usar respuesta confirmada</Boton></div>}
      <div className="flex flex-wrap gap-3">
        <Boton className="boton-secundario" disabled={!online || ocupado || Boolean(conflicto)} onClick={() => {
          pausar(undefined); void sincronizar();
        }}>{ocupado ? 'Verificando…' : 'Actualizar y sincronizar'}</Boton>
        <Boton disabled={!online || ocupado || !lista || almacenError || escribiendo || pendientes || restante(origen) <= 0}
          onClick={() => void finalizar()}>Finalizar intento</Boton>
      </div>
    </div>;

  return <VistaIntento origen={origen} modo={modo} marcas={[...marcas.values()]} marcar={(n, a) => void marcar(n, a)}
    bloqueado={!lista || almacenError || escribiendo || Boolean(conflicto) || ocupado} acciones={acciones}
    volver={() => { if (!pendientes || origen.intento.estado === 'FINALIZADO' || window.confirm(advertencia)) volver(); }} />;
}
