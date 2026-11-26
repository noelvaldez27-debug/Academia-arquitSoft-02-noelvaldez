import type { Pool } from 'pg';

const columnas = 'id, nombre, inicia_el::text AS "iniciaEl", termina_el::text AS "terminaEl", cerrado_en AS "cerradoEn"';

export class PostgresCiclosAcademicos {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async listar() {
    const { rows } = await this.bd.query(
      'SELECT ' + columnas + ' FROM ciclos_academicos ORDER BY inicia_el DESC, id',
    );
    return rows;
  }

  async crear(id: string, nombre: string, iniciaEl: string, terminaEl: string) {
    const { rows: [ciclo] } = await this.bd.query(
      'INSERT INTO ciclos_academicos (id,nombre,inicia_el,termina_el) VALUES ($1,$2,$3,$4) RETURNING ' + columnas,
      [id, nombre, iniciaEl, terminaEl],
    );
    return ciclo;
  }
}
