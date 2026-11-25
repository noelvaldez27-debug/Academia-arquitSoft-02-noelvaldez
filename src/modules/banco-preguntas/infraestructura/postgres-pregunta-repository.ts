import { Pool } from 'pg';
import { ConfiguracionSimulacro, ContenidoPregunta, Curso, Pregunta } from '../dominio/pregunta';
import { PreguntaRepository } from '../dominio/pregunta-repository';

type FilaPregunta = Omit<Pregunta, keyof ContenidoPregunta> & { contenido: ContenidoPregunta };
const columnas = 'id, curso_id AS "cursoId", contenido, habilitada, propuesta_id AS "propuestaId"';

function cargarPregunta({ contenido, ...fila }: FilaPregunta): Pregunta {
  return { ...fila, ...contenido };
}

export class PostgresPreguntaRepository implements PreguntaRepository {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async curso(id: string): Promise<Curso | null> {
    const { rows } = await this.bd.query<Curso>('SELECT id, nombre FROM cursos_banco WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async guardarCurso({ id, nombre }: Curso): Promise<void> {
    await this.bd.query(
      'INSERT INTO cursos_banco (id, nombre) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre',
      [id, nombre],
    );
  }

  async buscar(id: string): Promise<Pregunta | null> {
    const { rows } = await this.bd.query<FilaPregunta>(
      'SELECT ' + columnas + ' FROM preguntas_banco WHERE id = $1', [id],
    );
    return rows[0] ? cargarPregunta(rows[0]) : null;
  }

  async listar(cursoId: string): Promise<Pregunta[]> {
    const { rows } = await this.bd.query<FilaPregunta>(
      'SELECT ' + columnas + ' FROM preguntas_banco WHERE curso_id = $1 ORDER BY id', [cursoId],
    );
    return rows.map(cargarPregunta);
  }

  async guardar({ id, cursoId, habilitada, propuestaId, ...contenido }: Pregunta): Promise<void> {
    await this.bd.query(
      `INSERT INTO preguntas_banco (id, curso_id, contenido, habilitada, propuesta_id)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE
       SET contenido = EXCLUDED.contenido, habilitada = EXCLUDED.habilitada`,
      [id, cursoId, JSON.stringify(contenido), habilitada, propuestaId],
    );
  }

  async guardarSimulacro({ id, duracionMinutos, preguntas }: ConfiguracionSimulacro): Promise<void> {
    await this.bd.query(
      `INSERT INTO configuraciones_simulacro (id, duracion_minutos, preguntas)
       VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE
       SET duracion_minutos = EXCLUDED.duracion_minutos, preguntas = EXCLUDED.preguntas`,
      [id, duracionMinutos, JSON.stringify(preguntas)],
    );
  }

  async buscarSimulacro(id: string): Promise<ConfiguracionSimulacro | null> {
    const { rows } = await this.bd.query<ConfiguracionSimulacro>(
      'SELECT id, duracion_minutos AS "duracionMinutos", preguntas FROM configuraciones_simulacro WHERE id = $1', [id],
    );
    return rows[0] ?? null;
  }
}
