import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import type { CacheConsultas } from '../../../compartido/aplicacion/cache-consultas.port';
import { consultarCatalogo } from '../../../compartido/infraestructura/cache-catalogo';
import type { OpcionesPagina } from '../aplicacion/consultar-catalogos-banco';
import type { ConfiguracionSimulacro, Curso } from '../dominio/pregunta';

export function crearCatalogosBanco(bd: Pick<Pool, 'query'>, cache?: CacheConsultas) {
  const parametros = ({ pagina, limite, q }: OpcionesPagina) => [q, limite + 1, (pagina - 1) * limite];
  return {
    cursos(opciones: OpcionesPagina) {
      const args = parametros(opciones);
      return consultarCatalogo(bd, cache, {
        catalogo: 'cursos',
        filtro: 'listado:' + createHash('sha256').update(JSON.stringify(args)).digest('hex'),
        ttl: 300,
        validarFila: fila => typeof fila.id === 'string',
      }, async () => (await bd.query<Curso>(
        `SELECT id, nombre FROM cursos_banco WHERE $1 = '' OR strpos(lower(nombre), lower($1)) > 0
        ORDER BY lower(nombre), id LIMIT $2 OFFSET $3`, args,
      )).rows);
    },
    async simulacros(opciones: OpcionesPagina) {
      return (await bd.query<ConfiguracionSimulacro>(
        `SELECT id, duracion_minutos AS "duracionMinutos", preguntas
        FROM configuraciones_simulacro WHERE $1 = '' OR strpos(id, $1) > 0
        ORDER BY id LIMIT $2 OFFSET $3`, parametros(opciones),
      )).rows;
    },
    async docentes(curso: string, opciones: OpcionesPagina) {
      return (await bd.query<{ id: string }>(
        `SELECT docente_id::text AS id FROM asignaciones_docentes_banco WHERE curso_id = $1
        ORDER BY docente_id LIMIT $2 OFFSET $3`, [curso, opciones.limite + 1, (opciones.pagina - 1) * opciones.limite],
      )).rows;
    },
  };
}
