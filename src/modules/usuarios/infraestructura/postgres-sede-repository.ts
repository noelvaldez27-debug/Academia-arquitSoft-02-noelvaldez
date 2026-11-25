import { Pool } from 'pg';
import { Sede, SedeRepository } from '../dominio';

export class PostgresSedeRepository implements SedeRepository {
  constructor(private readonly pool: Pick<Pool, 'query'>) {}

  public async guardar(sede: Sede): Promise<Sede> {
    const res = await this.pool.query<{ id: number; nombre: string }>(
      'INSERT INTO sedes (nombre) VALUES ($1) RETURNING id, nombre;',
      [sede.nombre]
    );

    const fila = res.rows[0];
    return new Sede({
      id: String(fila.id),
      nombre: fila.nombre,
    });
  }

  public async buscarPorId(id: string): Promise<Sede | null> {
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      return null;
    }

    const res = await this.pool.query<{ id: number; nombre: string }>(
      'SELECT id, nombre FROM sedes WHERE id = $1;',
      [idNumerico]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const fila = res.rows[0];
    return new Sede({
      id: String(fila.id),
      nombre: fila.nombre,
    });
  }

  public async buscarPorNombre(nombre: string): Promise<Sede | null> {
    const res = await this.pool.query<{ id: number; nombre: string }>(
      'SELECT id, nombre FROM sedes WHERE LOWER(nombre) = LOWER($1);',
      [nombre.trim()]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const fila = res.rows[0];
    return new Sede({
      id: String(fila.id),
      nombre: fila.nombre,
    });
  }

  public async listarTodas(): Promise<Sede[]> {
    const res = await this.pool.query<{ id: number; nombre: string }>(
      'SELECT id, nombre FROM sedes ORDER BY id ASC;'
    );

    return res.rows.map(
      (fila) =>
        new Sede({
          id: String(fila.id),
          nombre: fila.nombre,
        })
    );
  }
}
