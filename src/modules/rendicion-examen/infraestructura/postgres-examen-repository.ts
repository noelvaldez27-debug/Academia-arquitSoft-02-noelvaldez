import { Pool } from 'pg';
import { ExamenRepository, ExamenFinalizado } from '../dominio/examen-repository';
import { Examen } from '../dominio/examen';
import { Respuesta } from '../dominio/respuesta';

interface FilaExamen {
  id: string;
  postulanteId: string;
  simulacroId: string;
  inicio: Date;
  vence: Date;
  cierre: Date | null;
}

const columnas = 'id, postulante_id AS "postulanteId", simulacro_id AS "simulacroId", inicio, vence, cierre';

function cargar(fila: FilaExamen | undefined): Examen | null {
  return fila ? new Examen(fila.id, fila.postulanteId, fila.simulacroId, fila.inicio, fila.vence, fila.cierre) : null;
}

export class PostgresExamenRepository implements ExamenRepository {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async buscar(id: string): Promise<Examen | null> {
    const { rows } = await this.bd.query<FilaExamen>(
      `SELECT ${columnas} FROM examenes_rendicion WHERE id = $1 FOR UPDATE`, [id],
    );
    return cargar(rows[0]);
  }

  async buscarIntento(postulanteId: string, simulacroId: string): Promise<Examen | null> {
    const { rows } = await this.bd.query<FilaExamen>(
      `SELECT ${columnas} FROM examenes_rendicion WHERE postulante_id = $1 AND simulacro_id = $2 FOR UPDATE`,
      [postulanteId, simulacroId],
    );
    return cargar(rows[0]);
  }

  async insertar(examen: Examen): Promise<Examen> {
    const { rows } = await this.bd.query<FilaExamen>(
      `INSERT INTO examenes_rendicion (id, postulante_id, simulacro_id, inicio, vence)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (postulante_id, simulacro_id) DO NOTHING RETURNING ${columnas}`,
      [examen.id, examen.postulanteId, examen.simulacroId, examen.inicio, examen.vence],
    );
    if (rows[0]) return cargar(rows[0])!;
    const existente = await this.buscarIntento(examen.postulanteId, examen.simulacroId);
    if (!existente) throw new Error('No se pudo recuperar el intento concurrente.');
    return existente;
  }

  async consolidar(examen: Examen, respuestas: Respuesta[]): Promise<void> {
    await this.bd.query(
      `WITH cerrado AS (
         UPDATE examenes_rendicion SET cierre = $2, respuestas = $3
         WHERE id = $1 AND cierre IS NULL RETURNING id
       )
       INSERT INTO envios_examen_finalizado (examen_id) SELECT id FROM cerrado`,
      [examen.id, examen.cierre, JSON.stringify(respuestas)],
    );
  }

  async consultarFinalizado(id: string): Promise<ExamenFinalizado | null> {
    const { rows } = await this.bd.query<ExamenFinalizado>(
      `SELECT id AS "examenId", postulante_id AS "postulanteId", simulacro_id AS "simulacroId", respuestas
       FROM examenes_rendicion WHERE id = $1 AND cierre IS NOT NULL`, [id],
    );
    return rows[0] ?? null;
  }

  async buscarVencidos(ahora: Date, limite: number): Promise<string[]> {
    const { rows } = await this.bd.query<{ id: string }>(
      `SELECT id FROM examenes_rendicion WHERE cierre IS NULL AND vence <= $1 ORDER BY vence, id LIMIT $2`,
      [ahora, limite],
    );
    return rows.map(({ id }) => id);
  }
}
