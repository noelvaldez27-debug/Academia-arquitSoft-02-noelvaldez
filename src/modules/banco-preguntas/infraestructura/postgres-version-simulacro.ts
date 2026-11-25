import { Pool } from 'pg';
import { ErrorBancoPreguntas } from '../dominio/errores';
import { ClaveAlternativa } from '../dominio/pregunta';
import { SimulacroParaRendicion } from '../aplicacion/gestionar-simulacros.use-case';

type PreguntaCongelada = SimulacroParaRendicion['preguntas'][number] & { correcta: ClaveAlternativa };
type Version = Omit<SimulacroParaRendicion, 'preguntas'> & { preguntas: PreguntaCongelada[] };

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
             'correcta', p.contenido->'correcta') ORDER BY q.orden)
         FROM configuraciones_simulacro c
         CROSS JOIN LATERAL jsonb_array_elements_text(c.preguntas) WITH ORDINALITY q(id, orden)
         LEFT JOIN preguntas_banco p ON p.id = q.id AND p.habilitada
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
