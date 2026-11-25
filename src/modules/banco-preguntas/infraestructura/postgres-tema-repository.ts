import type { Pool } from 'pg';
import { ErrorBancoPreguntas } from '../dominio/errores';
import { Tema, TemaRepository } from '../dominio/tema-repository';

const columnas = 'id, curso_id AS "cursoId", nombre, activo';

export class PostgresTemaRepository implements TemaRepository {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async listar(cursoId: string) {
    const { rows } = await this.bd.query<Tema>(
      `SELECT ${columnas} FROM temas_banco WHERE curso_id = $1 AND activo ORDER BY nombre, id`, [cursoId],
    );
    return rows;
  }

  crear({ id, cursoId, nombre }: Tema) {
    return this.escribir(
      `INSERT INTO temas_banco (id, curso_id, nombre) VALUES ($1,$2,$3) RETURNING ${columnas}`,
      [id, cursoId, nombre],
    );
  }

  actualizar(id: string, { nombre, activo }: { nombre?: string; activo?: false }) {
    return this.escribir(
      `UPDATE temas_banco SET nombre = coalesce($2, nombre), activo = coalesce($3, activo)
       WHERE id = $1 RETURNING ${columnas}`, [id, nombre, activo],
    );
  }

  private async escribir(sql: string, parametros: unknown[]) {
    try {
      const { rows } = await this.bd.query<Tema>(sql, parametros);
      if (!rows[0]) throw new ErrorBancoPreguntas('no-encontrado', 'Tema no encontrado.');
      return rows[0];
    } catch (error) {
      if ((error as { constraint?: string }).constraint === 'temas_banco_nombre_por_curso') {
        throw new ErrorBancoPreguntas('conflicto', 'Ya existe un tema con ese nombre en el curso.');
      }
      throw error;
    }
  }
}
