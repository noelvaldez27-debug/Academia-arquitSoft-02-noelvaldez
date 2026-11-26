import { Estado } from '../../compartido/controles';
import { usarLectura } from '../banco-preguntas/lecturas';
import { Consulta, formatoNota } from '../ranking-reportes/ranking';

export const rutaAnalitica = '/api/v1/analitica';
export const respuestas = [['correctas', 'Correctas'], ['incorrectas', 'Incorrectas'], ['omitidas', 'Omitidas']] as const;
export type Conteos = Record<typeof respuestas[number][0], number>;
type Examen = Conteos & { simulacroId: string; fecha: string; puntaje: number };
type CursoEvaluado = Conteos & { cursoId: string; total: number; desempeno: number };
interface Historial { historial: Examen[]; porCurso: CursoEvaluado[] }
const formatoFecha = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });
const colores = ['bg-teal-700', 'bg-rose-700', 'bg-slate-500'];

export function Distribucion({ valores, maximo }: { valores: number[]; maximo: number }) {
  return <div aria-hidden="true" className="flex h-2 min-w-24 overflow-hidden rounded-full bg-slate-200">
    {valores.map((valor, i) => <span key={i} className={colores[i]} style={{ width: (valor / maximo * 100) + '%' }} />)}
  </div>;
}

function Evolucion({ examenes }: { examenes: Examen[] }) {
  const puntos = examenes.map((examen, i) => ({
    x: examenes.length === 1 ? 160 : 40 + i * 264 / (examenes.length - 1),
    y: 120 - examen.puntaje * 0.104,
  }));
  return <section className="panel-acceso grid gap-4" aria-labelledby="titulo-evolucion">
    <h2 id="titulo-evolucion" className="text-xl font-bold">Evolución del puntaje</h2>
    <svg aria-hidden="true" viewBox="0 0 320 138" className="w-full max-w-3xl" focusable="false">
      {[1000, 500, 0].map(valor => {
        const y = 120 - valor * 0.104;
        return <g key={valor}>
          <text x="0" y={y + 3} fill="#334155" fontSize="10">{valor}</text>
          <line x1="40" x2="304" y1={y} y2={y} stroke="#cbd5e1" />
        </g>;
      })}
      <polyline fill="none" stroke="#0f766e" strokeWidth="2" points={puntos.map(({ x, y }) => x + ',' + y).join(' ')} />
      {puntos.map(({ x, y }, i) => <circle key={i} cx={x} cy={y} r="3.5" fill="#0f766e" />)}
    </svg>
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla desplazable de simulacros">
      <table className="w-full text-left text-sm">
        <caption className="mb-2 text-left font-semibold">Comparación de simulacros y distribución de respuestas</caption>
        <thead><tr>
          {['Simulacro', 'Fecha de cierre', 'Puntaje sobre 1000', ...respuestas.map(([, nombre]) => nombre), 'Distribución'].map(nombre => (
            <th key={nombre} scope="col" className="p-2">{nombre}</th>
          ))}
        </tr></thead>
        <tbody>{examenes.map(examen => <tr className="border-t" key={examen.simulacroId}>
          <th scope="row" className="break-words p-2 font-medium">{examen.simulacroId}</th>
          <td className="p-2"><time dateTime={examen.fecha}>{formatoFecha.format(new Date(examen.fecha))}</time></td>
          <td className="p-2">{formatoNota.format(examen.puntaje)}</td>
          {respuestas.map(([campo]) => <td key={campo} className="p-2">{examen[campo]}</td>)}
          <td className="p-2"><Distribucion valores={respuestas.map(([campo]) => examen[campo])}
            maximo={examen.correctas + examen.incorrectas + examen.omitidas || 1} /></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

function Rendimiento({ cursos }: { cursos: CursoEvaluado[] }) {
  const evaluados = cursos.filter(curso => curso.total > 0);
  return <section className="panel-acceso grid gap-4" aria-labelledby="titulo-rendimiento">
    <h2 id="titulo-rendimiento" className="text-xl font-bold">Rendimiento por curso</h2>
    {evaluados.length === 0 ? <Estado>No hay cursos evaluados en tu historial.</Estado> : <>
      <p className="text-sm">Se muestran los cursos con preguntas evaluadas.</p>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla desplazable de rendimiento">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Porcentajes y conteos por curso</caption>
          <thead><tr>
            {['Curso', 'Rendimiento', ...respuestas.map(([, nombre]) => nombre), 'Evaluadas'].map(nombre => (
              <th key={nombre} scope="col" className="p-2">{nombre}</th>
            ))}
          </tr></thead>
          <tbody>{evaluados.map(curso => <tr key={curso.cursoId} className="border-t">
            <th scope="row" className="break-words p-2 font-medium">{curso.cursoId}</th>
            <td className="min-w-32 p-2">{formatoNota.format(curso.desempeno)} %
              <Distribucion valores={[curso.desempeno]} maximo={100} /></td>
            {respuestas.map(([campo]) => <td key={campo} className="p-2">{curso[campo]}</td>)}
            <td className="p-2">{curso.total}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </section>;
}

export function MiHistorial() {
  const consulta = usarLectura<Historial>(rutaAnalitica + '/mi-historial');
  const datos = consulta?.datos;
  return <div className="mt-6 grid gap-5"><Consulta carga={consulta}>
    {datos && (datos.historial.length ? <><Evolucion examenes={datos.historial} /><Rendimiento cursos={datos.porCurso} /></>
      : <Estado>Aún no tienes simulacros calificados.</Estado>)}
  </Consulta></div>;
}
