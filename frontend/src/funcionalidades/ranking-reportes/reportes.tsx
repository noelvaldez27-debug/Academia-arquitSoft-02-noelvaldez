import { useEffect, useRef, useState } from 'react';
import { usarSesion } from '../../app/sesion';
import { Boton, Estado } from '../../compartido/controles';
import { descargar } from '../../compartido/descargar';
import { ElegirCurso } from '../banco-preguntas/banco';
import { textoFallo, usarLectura, type Curso } from '../banco-preguntas/lecturas';
import { Consulta, ElegirSimulacro, FiltrosRanking, Publicacion, RankingAdministrativo, TablaPuestos, rutaRanking,
  type FilaRanking } from './ranking';

type TipoReporte = 'participacion' | 'resultados' | 'meritos';
const indicadores = [
  ['inscritos', 'Inscritos en el padrón'], ['participantes', 'Participantes'], ['noParticipantes', 'No participantes'],
  ['enCurso', 'Intentos activos'], ['finalizados', 'Intentos finalizados'], ['calificados', 'Intentos calificados'],
  ['porcentajeParticipacion', 'Porcentaje de participación'],
] as const;
type Participacion = Record<typeof indicadores[number][0], number | null>;
interface Reporte {
  estado: 'PROVISIONAL' | 'DEFINITIVO';
  resumen?: Participacion;
  filas?: (FilaRanking & { correctas: number; incorrectas: number; omitidas: number })[];
}

function ReporteAdministrador({ ruta, tipo }: { ruta: string; tipo: TipoReporte }) {
  const { solicitar } = usarSesion();
  const consulta = usarLectura<Reporte>(ruta);
  const [descargando, cambiarDescarga] = useState(false);
  const [error, fallar] = useState('');
  const descarga = useRef<AbortController | null>(null);
  useEffect(() => () => descarga.current?.abort(), []);

  async function exportar() {
    if (descarga.current) return;
    const control = new AbortController();
    descarga.current = control;
    cambiarDescarga(true);
    fallar('');
    try {
      const archivo = await solicitar<Blob>(ruta + (ruta.includes('?') ? '&' : '?') + 'formato=xlsx', {
        formato: 'archivo', signal: control.signal,
      });
      if (!control.signal.aborted) descargar(archivo, tipo + '.xlsx');
    } catch (causa) {
      if (!control.signal.aborted) fallar(textoFallo(causa));
    } finally {
      if (!control.signal.aborted) cambiarDescarga(false);
      descarga.current = null;
    }
  }
  const datos = consulta?.datos;
  return <Consulta carga={consulta}>{datos && <section className="panel-acceso grid gap-4" aria-label="Informe del simulacro">
    <Publicacion definitiva={datos.estado === 'DEFINITIVO'} />
    {datos.resumen && <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {indicadores.map(([clave, titulo]) => {
        const valor = datos.resumen?.[clave];
        return <div key={clave} className="rounded-lg bg-slate-50 p-3">
          <dt className="text-sm font-semibold">{titulo}</dt>
          <dd>{valor == null ? 'No disponible' : clave === 'porcentajeParticipacion' ? valor + ' %' : valor}</dd>
        </div>;
      })}
    </dl>}
    {datos.filas && <TablaPuestos filas={datos.filas} titulo={tipo === 'meritos' ? 'Cuadro de mérito' : 'Resultados'} detalle />}
    {error && <Estado tipo="error">{error}</Estado>}
    <Boton className="w-fit boton-secundario" disabled={descargando} onClick={() => void exportar()}>
      {descargando ? 'Descargando…' : 'Exportar Excel'}
    </Boton>
  </section>}</Consulta>;
}

interface ReporteDocente {
  definitiva: boolean;
  resumen: { calificados: number; correctas: number; incorrectas: number; omitidas: number };
}

export function DesempenoDocente() {
  const [id, elegir] = useState('');
  const [curso, elegirCurso] = useState<Curso>();
  const informe = usarLectura<ReporteDocente>(id && curso ? rutaRanking(id) + '/reportes/cursos/' + encodeURIComponent(curso.id) : undefined);
  const resumen = informe?.datos?.resumen;
  return <div className="mt-6 grid gap-5">
    <ElegirSimulacro catalogo={false} id={id} elegir={elegir} />
    {id && <p className="break-all text-sm">Simulacro {id}</p>}
    <ElegirCurso elegido={curso} seleccionar={elegirCurso} />
    {id && curso && <Consulta carga={informe}>{resumen && informe.datos && <section className="panel-acceso grid gap-3"
      aria-label="Agregados del curso">
      <Publicacion definitiva={informe.datos.definitiva} />
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt>Calificados</dt><dd>{resumen.calificados}</dd></div>
        <div><dt>Correctas</dt><dd>{resumen.correctas}</dd></div>
        <div><dt>Incorrectas</dt><dd>{resumen.incorrectas}</dd></div>
        <div><dt>Omitidas</dt><dd>{resumen.omitidas}</dd></div>
      </dl>
    </section>}</Consulta>}
  </div>;
}

export function PanelRanking({ general }: { general: boolean }) {
  const [id, elegir] = useState('');
  const [query, filtrar] = useState('');
  const [vista, abrir] = useState<'ranking' | TipoReporte>('ranking');
  const base = rutaRanking(id) + (vista === 'ranking' ? '' : '/reportes/' + vista) + (query ? '?' + query : '');
  const vistas = [['ranking', 'Ranking'], ['participacion', 'Participación'], ['resultados', 'Resultados'], ['meritos', 'Cuadro de mérito']] as const;
  return <div className="mt-6 grid gap-5">
    <ElegirSimulacro catalogo={general} id={id} elegir={elegir} />
    {id && <>
      <p className="break-all text-sm">Simulacro {id}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Vista de reportes">
        {vistas.map(([clave, titulo]) => <Boton key={clave} aria-pressed={vista === clave}
          className={vista === clave ? '' : 'boton-secundario'} onClick={() => { abrir(clave); filtrar(''); }}>{titulo}</Boton>)}
      </div>
      <FiltrosRanking key={vista} general={general} reporte={vista !== 'ranking'} aplicar={filtrar} />
      {vista === 'ranking' ? <RankingAdministrativo ruta={base} /> : <ReporteAdministrador key={base} ruta={base} tipo={vista} />}
    </>}
  </div>;
}
