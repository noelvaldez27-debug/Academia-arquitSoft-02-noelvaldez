import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { ErrorBancoPreguntas } from '../dominio/errores';
import { ClaveAlternativa } from '../dominio/pregunta';
import { SimulacroParaRendicion } from '../aplicacion/gestionar-simulacros.use-case';

import type { CacheConsultas } from '../../../compartido/aplicacion/cache-consultas.port';
import { consultarCatalogo } from '../../../compartido/infraestructura/cache-catalogo';

type PreguntaCongelada = SimulacroParaRendicion['preguntas'][number] & {
  correcta: ClaveAlternativa;
  tema?: { id: string; nombre: string } | null;
};
type Version = Omit<SimulacroParaRendicion, 'preguntas'> & { preguntas: PreguntaCongelada[] };

export function crearConsultaNombresCursos(bd: Pick<Pool, 'query'>, cache?: CacheConsultas) {
  return async (ids: string[]): Promise<{ id: string; nombre: string }[]> => {
    if (!ids.length) return [];
    const solicitados = new Set(ids);
    const filtro = createHash('sha256').update(JSON.stringify([...solicitados].sort())).digest('hex');
    return consultarCatalogo(bd, cache, {
      catalogo: 'cursos', filtro, ttl: 300,
      validarFila: fila => typeof fila.id === 'string' && solicitados.has(fila.id),
    }, async () => (await bd.query<{ id: string; nombre: string }>(
      'SELECT id, nombre FROM cursos_banco WHERE id = ANY($1::text[])', [ids],
    )).rows);
  };
}

export function crearConsultaPreguntasHistoricas(bd: Pick<Pool, 'query'>) {
  return async (ids: string[]) => {
    if (!ids.length) return [];
    const { rows } = await bd.query<Version>(
      'SELECT id, preguntas FROM versiones_simulacro WHERE id = ANY($1::text[])',
      [ids],
    );
    return rows.flatMap(({ id: simulacroId, preguntas }) =>
      preguntas.map(({ id: preguntaId, cursoId, enunciado, alternativas, correcta, tema }) => {
        const contenido = [enunciado, alternativas.A, alternativas.B, alternativas.C, alternativas.D,
          alternativas.E, correcta];
        return {
          simulacroId, preguntaId, cursoId, enunciado, tema: tema ?? null,
          // Incluye la clave para distinguir versiones. Solo se usa para agrupación interna.
          huellaInterna: createHash('sha256').update(JSON.stringify(contenido)).digest('hex'),
        };
      }));
  };
}

export function crearConsultaClavesCongeladas(bd: Pick<Pool, 'query'>) {
  const versiones = new PostgresVersionSimulacro(bd);
  return { clave: (id: string) => versiones.claveCongelada(id) };
}

export class PostgresVersionSimulacro {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  private async buscar(id: string): Promise<Version | undefined> {
    const { rows } = await this.bd.query<Version>(
      'SELECT id, duracion_minutos AS "duracionMinutos", preguntas FROM versiones_simulacro WHERE id = $1', [id],
    );
    return rows[0];
  }

  async congelar(id: string): Promise<SimulacroParaRendicion> {
    let version = await this.buscar(id);
    if (!version) {
      const { rows } = await this.bd.query<Version>(
        `INSERT INTO versiones_simulacro (id, duracion_minutos, preguntas)
         SELECT c.id, c.duracion_minutos,
           jsonb_agg(jsonb_build_object('id', p.id, 'cursoId', p.curso_id,
             'enunciado', p.contenido->'enunciado', 'alternativas', p.contenido->'alternativas',
             'correcta', p.contenido->'correcta',
             'tema', CASE WHEN t.id IS NOT NULL THEN jsonb_build_object('id', t.id, 'nombre', t.nombre) END
           ) ORDER BY q.orden)
         FROM configuraciones_simulacro c
         CROSS JOIN LATERAL jsonb_array_elements_text(c.preguntas) WITH ORDINALITY q(id, orden)
         LEFT JOIN preguntas_banco p ON p.id = q.id AND p.habilitada
         LEFT JOIN temas_banco t ON t.id = p.contenido->>'temaId' AND t.curso_id = p.curso_id
         WHERE c.id = $1 GROUP BY c.id
         HAVING count(*) = count(p.id)
         ON CONFLICT (id) DO NOTHING
         RETURNING id, duracion_minutos AS "duracionMinutos", preguntas`, [id],
      );
      version = rows[0] ?? await this.buscar(id);
    }
    if (!version) {
      const { rowCount } = await this.bd.query('SELECT 1 FROM configuraciones_simulacro WHERE id = $1', [id]);
      if (!rowCount) throw new ErrorBancoPreguntas('no-encontrado', 'Simulacro no encontrado.');
      throw new ErrorBancoPreguntas('conflicto', 'El simulacro contiene preguntas no disponibles.');
    }
    return {
      id: version.id, duracionMinutos: version.duracionMinutos,
      preguntas: version.preguntas.map(({ id, cursoId, enunciado, alternativas }) => ({ id, cursoId, enunciado, alternativas })),
    };
  }

  async clave(id: string) {
    const version = await this.buscar(id);
    return version?.preguntas.map(({ id: preguntaId, correcta }) => ({ preguntaId, correcta }));
  }

  async claveCongelada(id: string) {
    const version = await this.buscar(id);
    return version?.preguntas.map(({ id: preguntaId, cursoId, correcta }) => ({ preguntaId, cursoId, correcta })) ?? null;
  }
}
