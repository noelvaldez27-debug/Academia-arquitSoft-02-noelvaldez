import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usarSesion } from '../../app/sesion';
import { ErrorApi } from '../../compartido/cliente-rest';
import { Boton, Estado } from '../../compartido/controles';
import { examenes, type Intento, type Opcion } from '../rendicion/contratos';

type Conteos = { correctas: number; incorrectas: number; omitidas: number };
type Nota = Conteos & {
  estado: 'PROCESADO'; examenId: string; simulacroId: string; puntaje: number;
  porCurso: (Conteos & { cursoId: string })[];
};
type Resultado = Nota | { estado: 'PENDIENTE'; examenId: string };
type Lectura = { estado: 'carga' | 'pendiente' | 'pausa' | 'ausente' }
  | { estado: 'error'; mensaje: string; reintentar: boolean }
  | { estado: 'lista'; nota: Nota };

const esperaBaseMs = 2000;
const ventanaMs = 60000;
const puntaje = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' });
const columnas = [['correctas', 'Correctas'], ['incorrectas', 'Incorrectas'], ['omitidas', 'Omitidas']] as const;

function DetalleNota({ id }: { id: string }) {
  const { solicitar } = usarSesion();
  const [lectura, cambiarLectura] = useState<Lectura>({ estado: 'carga' });
  const [revision, consultar] = useState(0);
  const [inicio, cambiarInicio] = useState<string | null>(null);
  const definitiva = lectura.estado === 'lista';

  useEffect(() => {
    if (!definitiva) return;
    const control = new AbortController();
    void solicitar<Pick<Intento, 'inicio'>>(examenes + '/' + encodeURIComponent(id), { signal: control.signal })
      .then(datos => { if (!control.signal.aborted) cambiarInicio(datos.inicio); })
      .catch(() => undefined);
    return () => control.abort();
  }, [definitiva, id, solicitar]);

  useEffect(() => {
    const control = new AbortController();
    const limite = performance.now() + ventanaMs;
    let siguiente: ReturnType<typeof setTimeout> | undefined;
    const plazo = setTimeout(() => {
      clearTimeout(siguiente);
      control.abort();
      cambiarLectura({ estado: 'pausa' });
    }, ventanaMs);

    async function revisar() {
      let espera = esperaBaseMs;
      try {
        const resultado = await solicitar<Resultado>('/api/v1/resultados/' + encodeURIComponent(id), {
          signal: control.signal,
          recibirCabeceras(cabeceras) {
            const segundos = Number(cabeceras.get('Retry-After'));
            if (Number.isFinite(segundos)) espera = Math.max(esperaBaseMs, segundos * 1000);
          },
        });
        if (control.signal.aborted) return;
        if (resultado.estado === 'PROCESADO') {
          clearTimeout(plazo);
          cambiarLectura({ estado: 'lista', nota: resultado });
          return;
        }
        cambiarLectura({ estado: 'pendiente' });
        if (performance.now() + espera < limite) siguiente = setTimeout(revisar, espera);
      } catch (error) {
        if (control.signal.aborted) return;
        clearTimeout(plazo);
        if (error instanceof ErrorApi && error.estado === 404) {
          cambiarLectura({ estado: 'ausente' });
        } else {
          cambiarLectura({
            estado: 'error',
            mensaje: error instanceof ErrorApi ? error.message : 'No se pudo consultar tu calificación.',
            reintentar: !(error instanceof ErrorApi) || error.estado === 0 || error.estado >= 500,
          });
        }
      }
    }
    cambiarLectura({ estado: 'carga' });
    void revisar();
    return () => {
      clearTimeout(plazo);
      clearTimeout(siguiente);
      control.abort();
    };
  }, [id, revision, solicitar]);

  if (lectura.estado === 'lista') {
    const { nota } = lectura;
    return <section aria-labelledby="calificacion-titulo" className="panel-acceso grid gap-5">
      <div>
        <h2 id="calificacion-titulo" className="text-xl font-bold">Calificación definitiva</h2>
        <p className="mt-2 break-all text-sm">Simulacro {nota.simulacroId}</p>
        <p className="text-sm">Fecha del examen {inicio ? <time dateTime={inicio}>{fecha.format(new Date(inicio))}</time> : 'sin confirmar'}</p>
      </div>
      <p className="text-3xl font-bold tabular-nums">{puntaje.format(nota.puntaje)} <span className="text-lg">/ 1000 puntos</span></p>
      <dl className="grid grid-cols-3 gap-2">
        {columnas.map(([clave, titulo]) => <div key={clave}><dt className="text-sm">{titulo}</dt><dd className="text-xl font-semibold">{nota[clave]}</dd></div>)}
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold">Resultados por curso</caption>
          <thead><tr><th scope="col" className="pr-2">Curso</th>{columnas.map(([clave, titulo]) => <th scope="col" className="p-2" key={clave}>{titulo}</th>)}</tr></thead>
          <tbody>{nota.porCurso.map(curso => <tr key={curso.cursoId} className="border-t">
            <th scope="row" className="break-all py-2 pr-2 font-medium">{curso.cursoId}</th>
            {columnas.map(([clave]) => <td className="p-2" key={clave}>{curso[clave]}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>;
  }
  if (lectura.estado === 'carga') return <Estado tipo="carga">Consultando tu calificación…</Estado>;
  if (lectura.estado === 'pendiente') return <Estado>Calificación pendiente. Esta pantalla se actualizará automáticamente.</Estado>;
  if (lectura.estado === 'ausente') return <Estado>La calificación de este intento no está disponible.</Estado>;
  return <div className="grid gap-3">
    {lectura.estado === 'error'
      ? <Estado tipo="error">{lectura.mensaje}</Estado>
      : <Estado>La consulta automática se pausó. Puedes volver a consultar la calificación.</Estado>}
    {(lectura.estado === 'pausa' || (lectura.estado === 'error' && lectura.reintentar)) &&
      <Boton className="boton-secundario w-fit" onClick={() => consultar(n => n + 1)}>Volver a consultar</Boton>}
  </div>;
}

export function MiNota() {
  const ubicacion = useLocation();
  const referencia = ubicacion.state?.intentoId;
  return <ConsultaPropia key={ubicacion.key} referencia={typeof referencia === 'string' ? referencia : ''} />;
}

function ConsultaPropia({ referencia }: { referencia: string }) {
  const { solicitar } = usarSesion();
  const [opciones, cambiarOpciones] = useState<(Opcion & { intentoId: string })[] | null>(null);
  const [seleccion, cambiarSeleccion] = useState(referencia);
  const [error, cambiarError] = useState(false);
  useEffect(() => {
    const control = new AbortController();
    void solicitar<Opcion[]>(examenes + '/simulacros', { signal: control.signal })
      .then(lista => {
        if (control.signal.aborted) return;
        const finalizados = lista.filter((s): s is Opcion & { intentoId: string } => s.estado === 'FINALIZADO' && s.intentoId !== null);
        cambiarOpciones(finalizados);
      })
      .catch(() => { if (!control.signal.aborted) cambiarError(true); });
    return () => control.abort();
  }, [solicitar]);

  return <div className="mt-6 grid max-w-3xl gap-5">
    {opciones && opciones.length > 0 && <div className="grid gap-2">
      <label htmlFor="nota-simulacro" className="text-sm font-semibold">Simulacro realizado</label>
      <select id="nota-simulacro" className="campo" value={seleccion} onChange={e => cambiarSeleccion(e.target.value)}>
        <option value="">Selecciona un simulacro</option>
        {opciones.map(s => <option value={s.intentoId} key={s.intentoId}>{s.simulacroId}</option>)}
      </select>
    </div>}
    {error && <Estado tipo="error">No se pudo consultar la lista de simulacros realizados.</Estado>}
    {seleccion ? <DetalleNota key={seleccion} id={seleccion} /> : opciones
      ? <Estado>{opciones.length ? 'Selecciona un simulacro para consultar tu calificación.' : 'Aún no tienes simulacros finalizados.'}</Estado>
      : !error && <Estado tipo="carga">Consultando tus simulacros finalizados…</Estado>}
  </div>;
}
