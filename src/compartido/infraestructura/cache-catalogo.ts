import type { Pool } from 'pg';
import type { CacheConsultas } from '../aplicacion/cache-consultas.port';

interface FilaCatalogo { id: string | number; nombre: string }

export async function consultarCatalogo<T extends FilaCatalogo>(
  bd: Pick<Pool, 'query'>,
  cache: CacheConsultas | undefined,
  opciones: {
    catalogo: 'temas' | 'cursos' | 'sedes';
    filtro: string;
    ttl: number;
    validarFila: (fila: FilaCatalogo) => boolean;
  },
  fuente: () => Promise<T[]>,
): Promise<T[]> {
  if (!cache) return fuente();
  const { catalogo, filtro, ttl, validarFila } = opciones;
  const obtenerGeneracion = async () => {
    const { rows } = await bd.query<{ generacion: string }>(
      'SELECT generacion FROM generaciones_cache_catalogo WHERE catalogo = $1', [catalogo],
    );
    return rows[0]?.generacion;
  };
  const generacion = await obtenerGeneracion();
  if (generacion === undefined) return fuente();
  const clave = ['catalogo', 'v1', catalogo, generacion, filtro].join(':');
  const vigente = await cache.leer(clave, (dato): dato is T[] =>
    Array.isArray(dato) && dato.every(fila => fila && typeof fila.nombre === 'string' && validarFila(fila)));
  if (vigente !== undefined) return vigente;
  const datos = await fuente();
  if (generacion === await obtenerGeneracion()) await cache.guardar(clave, datos, ttl);
  return datos;
}
