import { useState, type FormEvent } from 'react';
import type { Perfil } from '../../app/navegacion';
import { Boton, Campo, Estado } from '../../compartido/controles';
import { Paginador } from '../banco-preguntas/banco';
import { usarLectura } from '../banco-preguntas/lecturas';
import { Consulta, formatoNota } from '../ranking-reportes/ranking';
import { Selector } from '../usuarios/gestion';
import { Distribucion, rutaAnalitica, type Conteos } from './historial';

type Indicadores = Conteos & {
  cursoId: string; total: number; tasaAciertos: number; tasaErrores: number; tasaOmisiones: number;
};
interface Estadisticas {
  intentosSinSedeHistorica: number;
  porCurso: Indicadores[];
  porTema: (Indicadores & { temaId: string | null; nombresHistoricos: string[] })[];
  porPregunta: (Indicadores & { preguntaId: string; enunciado: string | null; versionesSimulacro: string[] })[];
}
const columnas = [['correctas', 'tasaAciertos', 'Correctas'], ['incorrectas', 'tasaErrores', 'Incorrectas'],
  ['omitidas', 'tasaOmisiones', 'Omitidas']] as const;
const grupos = [['porCurso', 'Por curso'], ['porTema', 'Por tema'], ['porPregunta', 'Por pregunta']] as const;
type Grupo = typeof grupos[number][0];
type Fila = Indicadores & { clave: string; nombre: string; detalle?: string };

function filasDe(datos: Estadisticas, grupo: Grupo): Fila[] {
  if (grupo === 'porTema') return datos.porTema.map(fila => ({
    ...fila, clave: JSON.stringify([fila.cursoId, fila.temaId]),
    nombre: fila.temaId === null ? 'Sin clasificar' : fila.nombresHistoricos.join(' / ') || fila.temaId,
    detalle: 'Curso ' + fila.cursoId,
  }));
  if (grupo === 'porPregunta') return datos.porPregunta.map(fila => ({
    ...fila, clave: JSON.stringify([fila.cursoId, fila.preguntaId, fila.versionesSimulacro]),
    nombre: fila.enunciado ?? 'Pregunta ' + fila.preguntaId,
    detalle: [fila.cursoId, fila.preguntaId, ...fila.versionesSimulacro].join(' · '),
  }));
  return datos.porCurso.map(fila => ({ ...fila, clave: fila.cursoId, nombre: fila.cursoId }));
}

function TablaEstadisticas({ filas, titulo }: { filas: Fila[]; titulo: string }) {
  const [pagina, cambiarPagina] = useState(1);
  if (!filas.length) return <Estado>No hay preguntas evaluadas para estos filtros.</Estado>;
  const limite = 20;
  return <div className="grid gap-3">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="mb-2 text-left font-semibold">{titulo}</caption>
        <thead><tr>
          <th scope="col" className="p-2">Elemento evaluado</th>
          {columnas.map(([, , nombre]) => <th key={nombre} scope="col" className="p-2">{nombre}</th>)}
          <th scope="col" className="p-2">Total</th><th scope="col" className="p-2">Distribución</th>
        </tr></thead>
        <tbody>{filas.slice((pagina - 1) * limite, pagina * limite).map(fila => <tr key={fila.clave} className="border-t">
          <th scope="row" className="min-w-40 break-words p-2 font-medium">{fila.nombre}
            {fila.detalle && <span className="block text-xs text-slate-600">{fila.detalle}</span>}</th>
          {columnas.map(([conteo, tasa]) => <td key={conteo} className="whitespace-nowrap p-2">
            {fila[conteo]} <span className="block text-xs text-slate-600">{formatoNota.format(fila[tasa])} %</span>
          </td>)}
          <td className="p-2">{fila.total}</td>
          <td className="p-2"><Distribucion valores={columnas.map(([, tasa]) => fila[tasa])} maximo={100} /></td>
        </tr>)}</tbody>
      </table>
    </div>
    {filas.length > limite && <Paginador pagina={pagina} hayMas={pagina * limite < filas.length} seleccionar={cambiarPagina} />}
  </div>;
}

export function EstadisticasAcademicas({ perfil }: { perfil: Exclude<Perfil, 'postulante'> }) {
  const [filtros, filtrar] = useState('');
  const [revision, recargar] = useState(0);
  const [grupo, seleccionar] = useState<Grupo>('porCurso');
  const general = perfil === 'general';
  const sedes = usarLectura<{ id: string; nombre: string }[]>(general ? '/api/usuarios/sedes' : undefined);
  const datos = usarLectura<Estadisticas>(rutaAnalitica + '/estadisticas' + (filtros ? '?' + filtros : ''), revision);
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const consulta = new URLSearchParams();
    for (const [nombre, valor] of new FormData(evento.currentTarget)) {
      if (typeof valor === 'string' && valor.trim()) consulta.set(nombre, valor.trim());
    }
    filtrar(consulta.toString());
    recargar(n => n + 1);
  }
  return <section className="mt-6 grid gap-5" aria-label="Estadísticas académicas">
    <form className="flex flex-wrap items-end gap-3" onSubmit={enviar}>
      <Campo id="estadistica-simulacro" etiqueta="Referencia del simulacro" name="simulacroId" maxLength={255} />
      <Campo id="estadistica-curso" etiqueta="Referencia del curso" name="cursoId" maxLength={255} />
      <Campo id="estadistica-tema" etiqueta="Referencia del tema" name="temaId" maxLength={255}
        aria-describedby="tema-sin-clasificar" />
      {general && <Selector nombre="sedeId" etiqueta="Sede histórica" vacio="Todas las sedes"
        opciones={(sedes?.datos ?? []).map(s => ({ valor: String(s.id), texto: s.nombre }))} />}
      <Boton className="boton-secundario">Aplicar filtros</Boton>
      <p id="tema-sin-clasificar" className="w-full text-sm">Usa «sin-clasificar» para temas sin registro histórico.</p>
      {perfil === 'sede' && <p className="text-sm">Ámbito de tu sede</p>}
      {perfil === 'docente' && <p className="text-sm">Ámbito de tus cursos asignados</p>}
      {sedes?.error && <Estado tipo="error">{sedes.error}</Estado>}
    </form>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Agrupación de estadísticas">
      {grupos.map(([id, nombre]) => <Boton key={id} className={id === grupo ? '' : 'boton-secundario'}
        aria-pressed={id === grupo} onClick={() => seleccionar(id)}>{nombre}</Boton>)}
    </div>
    <Consulta carga={datos}>{datos?.datos && <div className="panel-acceso grid gap-3">
      {datos.datos.intentosSinSedeHistorica > 0 &&
        <p className="text-sm">Intentos incluidos sin sede histórica: {datos.datos.intentosSinSedeHistorica}</p>}
      <TablaEstadisticas key={JSON.stringify([grupo, filtros, revision])} filas={filasDe(datos.datos, grupo)}
        titulo={grupos.find(([id]) => id === grupo)?.[1] ?? 'Estadísticas'} />
    </div>}</Consulta>
  </section>;
}
