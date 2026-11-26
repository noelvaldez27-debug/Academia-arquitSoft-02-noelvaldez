import { Pool } from 'pg';
import { ExamenRepository, ExamenFinalizado } from '../dominio/examen-repository';
import { DatosInicialesPostulante, Examen, IntentoParaReportes } from '../dominio/examen';
import { Respuesta } from '../dominio/respuesta';

interface FilaExamen {
  id: string;
  postulanteId: string;
  simulacroId: string;
  inicio: Date;
  vence: Date;
  cierre: Date | null;
  carrera: DatosInicialesPostulante['carrera'];
  sedeId: DatosInicialesPostulante['sedeId'];
  condicion: DatosInicialesPostulante['condicion'];
}

const columnas = `id, postulante_id AS "postulanteId", simulacro_id AS "simulacroId", inicio, vence, cierre,
  carrera_inicial AS carrera, sede_inicial AS "sedeId", condicion_inicial AS condicion`;

export async function existenIntentosActivos(bd: Pick<Pool, 'query'>, postulantes: string[]) {
  const { rows } = await bd.query(
    'SELECT 1 FROM examenes_rendicion WHERE postulante_id = ANY($1::text[]) AND cierre IS NULL LIMIT 1',
    [postulantes],
  );
  return rows.length > 0;
}

export type IntentoCerradoParaAnalitica = Pick<IntentoParaReportes,
  'id' | 'postulanteId' | 'simulacroId' | 'sedeId'> & { cierre: Date };

export function crearConsultaIntentosCerrados(bd: Pick<Pool, 'query'>) {
  return async (ids: string[], postulanteId?: string): Promise<IntentoCerradoParaAnalitica[]> => {
    if (!ids.length) return [];
    const { rows } = await bd.query<IntentoCerradoParaAnalitica>(
      `SELECT id, postulante_id AS "postulanteId", simulacro_id AS "simulacroId",
              sede_inicial AS "sedeId", cierre
       FROM examenes_rendicion
       WHERE id = ANY($1::text[]) AND cierre IS NOT NULL
         AND ($2::text IS NULL OR postulante_id = $2)`,
      [ids, postulanteId ?? null],
    );
    return rows;
  };
}

export function crearConsultaExamenesFinalizados(bd: Pick<Pool, 'query'>) {
  const examenes = new PostgresExamenRepository(bd);
  return { consultar: (id: string) => examenes.consultarFinalizado(id) };
}

function cargar(fila: FilaExamen | undefined): Examen | null {
  return fila ? new Examen(fila.id, fila.postulanteId, fila.simulacroId, fila.inicio, fila.vence, fila.cierre, {
    carrera: fila.carrera ?? null, sedeId: fila.sedeId ?? null, condicion: fila.condicion ?? null,
  }) : null;
}

export class PostgresExamenRepository implements ExamenRepository {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async estadoParaReportes() {
    const { rows } = await this.bd.query<{ id: string; intentos: number; finalizados: number; cerrado: boolean }>(
      `WITH intentos AS (
         SELECT simulacro_id, count(*)::int AS total, count(cierre)::int AS finalizados
         FROM examenes_rendicion GROUP BY simulacro_id
       )
       SELECT simulacro_id AS id, coalesce(total, 0) AS intentos,
         coalesce(finalizados, 0) AS finalizados, cerrado_en IS NOT NULL AS cerrado
       FROM intentos FULL JOIN cierres_simulacro_rendicion USING (simulacro_id)`,
    );
    return rows;
  }

  async listarParaReportes(simulacroId: string, despues: string | null = null): Promise<IntentoParaReportes[]> {
    const { rows } = await this.bd.query<IntentoParaReportes>(
      `SELECT ${columnas} FROM examenes_rendicion
       WHERE simulacro_id = $1 AND ($2::text IS NULL OR id > $2) ORDER BY id LIMIT 100`,
      [simulacroId, despues],
    );
    return rows.map(({ id, postulanteId, inicio, cierre, carrera, sedeId, condicion }) =>
      ({ id, postulanteId, simulacroId, inicio, cierre, carrera, sedeId, condicion }));
  }

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
      `INSERT INTO examenes_rendicion (id, postulante_id, simulacro_id, inicio, vence, carrera_inicial, sede_inicial, condicion_inicial)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (postulante_id, simulacro_id) DO NOTHING RETURNING ${columnas}`,
      [examen.id, examen.postulanteId, examen.simulacroId, examen.inicio, examen.vence,
        examen.datosIniciales?.carrera, examen.datosIniciales?.sedeId, examen.datosIniciales?.condicion],
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
