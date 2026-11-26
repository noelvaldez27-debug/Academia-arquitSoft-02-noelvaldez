import { useState, type FormEvent, type ReactNode } from 'react';
import { Campo, Boton, Estado } from '../../compartido/controles';
import { Paginador } from '../banco-preguntas/banco';
import { banco, usarLectura, type Pagina } from '../banco-preguntas/lecturas';
import { examenes, type Opcion } from '../rendicion/contratos';
import { Selector } from '../usuarios/gestion';


type Puesto = { puesto: number | null; participantes: number };
interface Propio { definitiva: boolean; puntaje: number | null; general: Puesto; carrera: Puesto | null; sede: Puesto | null }
export interface FilaRanking { postulanteId: string; puesto: number; puntaje: number }
interface Ranking { definitiva: boolean; participantes: number; filas: FilaRanking[] }
export const formatoNota = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const rutaRanking = (id: string) => '/api/v1/rankings/' + encodeURIComponent(id);

export function Publicacion({ definitiva }: { definitiva: boolean }) {
  return <p className="font-semibold">{definitiva ? 'Publicación definitiva' : 'Publicación provisional'}</p>;
}

export function Consulta({ carga, children }: { carga?: { error?: string }; children: ReactNode }) {
  if (!carga) return <Estado tipo="carga">Consultando…</Estado>;
  if (carga.error) return <Estado tipo="error">{carga.error}</Estado>;
  return <>{children}</>;
}

export function MiPosicion() {
  const lista = usarLectura<Opcion[]>(examenes + '/simulacros');
  const [id, elegir] = useState('');
  const intento = usarLectura<Propio>(id ? rutaRanking(id) + '/propio' : undefined);
  const opciones = lista?.datos?.filter(s => s.intentoId !== null) ?? [];
  return <div className="mt-6 grid gap-5">
    <Consulta carga={lista}>
      {opciones.length ? <Selector nombre="simulacro-propio" etiqueta="Simulacro" valor={id} vacio="Selecciona un simulacro"
        opciones={opciones.map(s => ({ valor: s.simulacroId, texto: s.simulacroId }))} onChange={elegir} />
        : <Estado>Aún no tienes intentos para consultar.</Estado>}
    </Consulta>
    {id && <Consulta carga={intento}>{intento?.datos && <section aria-label="Mi clasificación" className="panel-acceso grid gap-4">
      <Publicacion definitiva={intento.datos.definitiva} />
      <p>{intento.datos.puntaje === null ? 'Puntaje pendiente' : formatoNota.format(intento.datos.puntaje) + ' / 1000 puntos'}</p>
      <dl className="grid gap-3 sm:grid-cols-3">
        {([['General', intento.datos.general], ['Por carrera', intento.datos.carrera], ['Por sede', intento.datos.sede]] as const)
          .map(([ambito, puesto]) => <div key={ambito}>
            <dt className="font-semibold">{ambito}</dt>
            <dd>{puesto?.puesto == null ? 'Sin posición disponible' : 'Puesto ' + puesto.puesto}</dd>
            {puesto && <dd>{puesto.participantes} participantes</dd>}
          </div>)}
      </dl>
    </section>}</Consulta>}
  </div>;
}

export function ElegirSimulacro({ catalogo, id, elegir }: { catalogo: boolean; id: string; elegir: (id: string) => void }) {
  const [pagina, cambiarPagina] = useState(1);
  const lista = usarLectura<Pagina<{ id: string }>>(catalogo ? banco + '/simulacros?pagina=' + pagina : undefined);
  if (!catalogo) return <form className="flex flex-wrap items-end gap-3" onSubmit={evento => {
    evento.preventDefault();
    elegir(String(new FormData(evento.currentTarget).get('simulacro')).trim());
  }}>
    <Campo id="referencia-simulacro" etiqueta="Referencia del simulacro" name="simulacro" required maxLength={255} />
    <Boton>Seleccionar simulacro</Boton>
  </form>;
  return <Consulta carga={lista}>
    <Selector nombre="simulacro-admin" etiqueta="Simulacro" valor={lista?.datos?.datos.some(s => s.id === id) ? id : ''}
      vacio="Selecciona un simulacro" opciones={(lista?.datos?.datos ?? []).map(s => ({ valor: s.id, texto: s.id }))} onChange={elegir} />
    <Paginador pagina={pagina} hayMas={Boolean(lista?.datos?.hayMas)} seleccionar={cambiarPagina} />
  </Consulta>;
}

export function TablaPuestos({ filas, titulo, detalle = false }: {
  filas: (FilaRanking & { correctas?: number; incorrectas?: number; omitidas?: number })[]; titulo: string; detalle?: boolean;
}) {
  const [pagina, cambiarPagina] = useState(1);
  if (!filas.length) return <Estado>No hay posiciones disponibles para estos filtros.</Estado>;
  const limite = 20;
  const actual = Math.min(pagina, Math.ceil(filas.length / limite));
  const columnas = ['Puesto', 'Referencia del postulante', 'Puntaje', ...(detalle ? ['Correctas', 'Incorrectas', 'Omitidas'] : [])];
  return <div className="grid gap-3">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="mb-2 text-left font-semibold">{titulo}</caption>
        <thead><tr>{columnas.map(columna => <th scope="col" key={columna} className="p-2">{columna}</th>)}</tr></thead>
        <tbody>{filas.slice((actual - 1) * limite, actual * limite).map(fila => <tr className="border-t" key={fila.postulanteId}>
          <td className="p-2">{fila.puesto}</td><th scope="row" className="break-words p-2 font-medium">{fila.postulanteId}</th>
          <td className="p-2">{formatoNota.format(fila.puntaje)}</td>
          {detalle && <><td className="p-2">{fila.correctas}</td><td className="p-2">{fila.incorrectas}</td><td className="p-2">{fila.omitidas}</td></>}
        </tr>)}</tbody>
      </table>
    </div>
    <Paginador pagina={actual} hayMas={actual * limite < filas.length} seleccionar={cambiarPagina} />
  </div>;
}

export function RankingAdministrativo({ ruta }: { ruta: string }) {
  const ranking = usarLectura<Ranking>(ruta);
  return <Consulta carga={ranking}>{ranking?.datos && <section className="panel-acceso grid gap-3" aria-label="Ranking administrativo">
    <Publicacion definitiva={ranking.datos.definitiva} />
    <p>{ranking.datos.participantes} participantes</p>
    <TablaPuestos key={ruta} filas={ranking.datos.filas} titulo="Posiciones" />
  </section>}</Consulta>;
}

export function FiltrosRanking({ general, reporte, aplicar }: { general: boolean; reporte: boolean; aplicar: (query: string) => void }) {
  const sedes = usarLectura<{ id: string; nombre: string }[]>(general ? '/api/usuarios/sedes' : undefined);
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const filtros = new URLSearchParams();
    for (const [nombre, valor] of new FormData(evento.currentTarget)) {
      if (typeof valor !== 'string' || !valor.trim()) continue;
      filtros.set(nombre, nombre === 'desde' || nombre === 'hasta' ? new Date(valor).toISOString() : valor.trim());
    }
    aplicar(filtros.toString());
  }
  return <form className="flex flex-wrap items-end gap-3" onSubmit={enviar}>
    <Campo id="ranking-carrera" etiqueta="Carrera" name="carrera" maxLength={255} />
    {general && <Selector nombre="sedeId" etiqueta="Sede" vacio="Todas las sedes"
      opciones={(sedes?.datos ?? []).map(s => ({ valor: String(s.id), texto: s.nombre }))} />}
    {!general && <p className="text-sm">Ámbito de tu sede</p>}
    {reporte && <>
      <Selector nombre="condicion" etiqueta="Condición histórica" vacio="Todas las condiciones" opciones={[
        { valor: 'MATRICULADO', texto: 'Matriculado' }, { valor: 'LIBRE', texto: 'Libre' },
        { valor: 'NO_DETERMINADA', texto: 'No determinada' },
      ]} />
      <Campo id="reporte-desde" etiqueta="Inicio desde" name="desde" type="datetime-local" />
      <Campo id="reporte-hasta" etiqueta="Inicio hasta" name="hasta" type="datetime-local" />
    </>}
    <Boton className="boton-secundario">Aplicar filtros</Boton>
    {sedes?.error && <Estado tipo="error">{sedes.error}</Estado>}
  </form>;
}
