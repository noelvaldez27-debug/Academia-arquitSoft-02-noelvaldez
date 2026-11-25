import { Pool } from 'pg';
import { Resultado } from '../dominio/resultado';
import { ResultadoRepository } from '../dominio/resultado-repository';

export class PostgresResultadoRepository implements ResultadoRepository {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async existePorExamen(id: string): Promise<boolean> {
    const { rows } = await this.bd.query('SELECT 1 FROM resultados_examen WHERE examen_id = $1', [id]);
    return rows.length > 0;
  }

  async guardarSiNoExiste(resultado: Resultado): Promise<void> {
    const { examenId, postulanteId, simulacroId, puntajeCentesimos, correctas, incorrectas, omitidas, porCurso, detalle } = resultado;
    await this.bd.query(
      `INSERT INTO resultados_examen
       (examen_id, postulante_id, simulacro_id, puntaje_centesimos, correctas, incorrectas, omitidas, por_curso, detalle)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (examen_id) DO NOTHING`,
      [examenId, postulanteId, simulacroId, puntajeCentesimos, correctas, incorrectas, omitidas,
        JSON.stringify(porCurso), JSON.stringify(detalle)],
    );
  }
}
