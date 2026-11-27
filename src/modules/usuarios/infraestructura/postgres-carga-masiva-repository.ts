import { Pool } from 'pg';
import {
  CargaMasiva,
  CargaMasivaRepository,
  EstadoCargaMasiva,
  DetalleErrorFila,
  FilaCargaMasiva,
} from '../dominio';

interface FilaCargaMasivaBD {
  id: string;
  usuario_id: number;
  sede_id: number | null;
  ciclo_id?: string | null;
  estado: string;
  total_filas: number;
  creadas: number;
  recuperadas?: number;
  vinculadas?: number;
  importacion_automatica?: boolean;
  ciclo_nombre?: string | null;
  ya_existian: number;
  rechazadas: number;
  errores: string | DetalleErrorFila[];
  avisos?: string | DetalleErrorFila[];
  creado_en: Date;
  actualizado_en: Date;
}

interface FilaLoteBD {
  id: number;
  carga_id: string;
  numero_lote: number;
  numero_fila: number;
  nombre: string;
  dni: string;
  sede_id: number;
  carrera: string;
  condicion: FilaCargaMasiva['condicion'];
  estado: string;
}

export class PostgresCargaMasivaRepository implements CargaMasivaRepository {
  constructor(private readonly pool: Pick<Pool, 'query'>) {}

  async listar(sedeId: string | null, actorId: string, pagina: number, limiteConExtra: number) {
    const { rows } = await this.pool.query<{ id: string; estado: string; creadaEl: Date; propia: boolean; cicloNombre: string | null }>(
      `SELECT c.id, c.estado, c.creado_en AS "creadaEl", (c.usuario_id = $2::integer) AS propia,
              ca.nombre AS "cicloNombre"
       FROM cargas_masivas c LEFT JOIN ciclos_academicos ca ON ca.id = c.ciclo_id
       WHERE ($1::integer IS NULL OR c.sede_id = $1::integer)
       ORDER BY c.creado_en DESC, c.id DESC LIMIT $3 OFFSET $4`,
      [sedeId, actorId, limiteConExtra, (pagina - 1) * (limiteConExtra - 1)],
    );
    return rows;
  }

  private parsearDetalles(valor: string | DetalleErrorFila[] | undefined): DetalleErrorFila[] {
    if (!valor) {
      return [];
    }
    if (typeof valor === 'string') {
      try {
        const parseado = JSON.parse(valor);
        return Array.isArray(parseado) ? parseado : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(valor) ? valor : [];
  }

  private mapearFilaACargaMasiva(fila: FilaCargaMasivaBD): CargaMasiva {
    return new CargaMasiva({
      id: fila.id,
      usuarioId: fila.usuario_id,
      sedeId: fila.sede_id,
      cicloId: fila.ciclo_id,
      estado: fila.estado as EstadoCargaMasiva,
      totalFilas: fila.total_filas,
      creadas: fila.creadas,
      recuperadas: fila.recuperadas,
      vinculadas: fila.vinculadas,
      cicloNombre: fila.ciclo_nombre,
      importacionAutomatica: fila.importacion_automatica,
      yaExistian: fila.ya_existian,
      rechazadas: fila.rechazadas,
      errores: this.parsearDetalles(fila.errores),
      avisos: this.parsearDetalles(fila.avisos),
      creadoEn: new Date(fila.creado_en),
      actualizadoEn: new Date(fila.actualizado_en),
    });
  }

  public async guardar(carga: CargaMasiva): Promise<void> {
    const query = `
      INSERT INTO cargas_masivas (id, usuario_id, sede_id, estado, total_filas, creadas, ya_existian, rechazadas, errores, avisos, creado_en, actualizado_en, ciclo_id, vinculadas, importacion_automatica)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);
    `;
    await this.pool.query(query, [
      carga.id,
      carga.usuarioId,
      carga.sedeId,
      carga.estado,
      carga.totalFilas,
      carga.creadas,
      carga.yaExistian,
      carga.rechazadas,
      JSON.stringify(carga.errores),
      JSON.stringify(carga.avisos),
      carga.creadoEn,
      carga.actualizadoEn,
      carga.cicloId,
      carga.vinculadas,
      carga.importacionAutomatica,
    ]);
  }

  public async buscarPorId(id: string): Promise<CargaMasiva | null> {
    const query = `
      SELECT c.id, c.usuario_id, c.sede_id, c.estado, c.total_filas, c.creadas, c.ya_existian, c.rechazadas,
        c.errores, c.avisos, c.creado_en, c.actualizado_en, c.ciclo_id, c.recuperadas, c.vinculadas,
        c.importacion_automatica, ca.nombre AS ciclo_nombre
      FROM cargas_masivas c LEFT JOIN ciclos_academicos ca ON ca.id = c.ciclo_id
      WHERE c.id = $1;
    `;
    const res = await this.pool.query<FilaCargaMasivaBD>(query, [id]);
    if (res.rows.length === 0) {
      return null;
    }
    return this.mapearFilaACargaMasiva(res.rows[0]);
  }

  public async actualizar(carga: CargaMasiva): Promise<void> {
    const query = `
      UPDATE cargas_masivas
      SET estado = $1, creadas = $2, ya_existian = $3, rechazadas = $4, errores = $5, avisos = $6, actualizado_en = $7,
          recuperadas = $9, vinculadas = $10
      WHERE id = $8;
    `;
    await this.pool.query(query, [
      carga.estado,
      carga.creadas,
      carga.yaExistian,
      carga.rechazadas,
      JSON.stringify(carga.errores),
      JSON.stringify(carga.avisos),
      carga.actualizadoEn,
      carga.id,
      carga.recuperadas,
      carga.vinculadas,
    ]);
  }

  public async guardarFilas(filas: FilaCargaMasiva[]): Promise<void> {
    if (filas.length === 0) return;

    // Inserción en bloques con parámetros seguros
    const tamañoBloque = 200;
    for (let i = 0; i < filas.length; i += tamañoBloque) {
      const bloque = filas.slice(i, i + tamañoBloque);
      const clausulasValores: string[] = [];
      const params: any[] = [];

      bloque.forEach((fila) => {
        const offset = params.length;
        clausulasValores.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`);
        params.push(
          fila.cargaId,
          fila.numeroLote,
          fila.numeroFila,
          fila.nombre,
          fila.dni,
          fila.sedeId,
          fila.carrera,
          fila.estado ?? 'PENDIENTE',
          fila.condicion ?? null,
        );
      });

      const sql = `
        INSERT INTO filas_carga_masiva (carga_id, numero_lote, numero_fila, nombre, dni, sede_id, carrera, estado, condicion)
        VALUES ${clausulasValores.join(', ')};
      `;
      await this.pool.query(sql, params);
    }
  }

  public async obtenerFilasPorLote(cargaId: string, lote: number): Promise<FilaCargaMasiva[]> {
    const query = `
      SELECT id, carga_id, numero_lote, numero_fila, nombre, dni, sede_id, carrera, estado, condicion
      FROM filas_carga_masiva
      WHERE carga_id = $1 AND numero_lote = $2
      ORDER BY numero_fila ASC;
    `;
    const res = await this.pool.query<FilaLoteBD>(query, [cargaId, lote]);
    return res.rows.map((fila) => ({
      id: fila.id,
      cargaId: fila.carga_id,
      numeroLote: fila.numero_lote,
      numeroFila: fila.numero_fila,
      nombre: fila.nombre,
      dni: fila.dni,
      sedeId: fila.sede_id,
      carrera: fila.carrera,
      ...(fila.condicion ? { condicion: fila.condicion } : {}),
      estado: fila.estado as 'PENDIENTE' | 'PROCESADA' | 'ERROR',
    }));
  }

  public async contarLotes(cargaId: string): Promise<number> {
    const query = `
      SELECT COALESCE(MAX(numero_lote), 0) AS total_lotes
      FROM filas_carga_masiva
      WHERE carga_id = $1;
    `;
    const res = await this.pool.query<{ total_lotes: string | number }>(query, [cargaId]);
    const val = res.rows[0]?.total_lotes ?? 0;
    return typeof val === 'number' ? val : parseInt(val, 10);
  }

  public async contarFilasPendientes(cargaId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) AS total
      FROM filas_carga_masiva
      WHERE carga_id = $1 AND estado = 'PENDIENTE';
    `;
    const res = await this.pool.query<{ total: string | number }>(query, [cargaId]);
    const val = res.rows[0]?.total ?? 0;
    return typeof val === 'number' ? val : parseInt(val, 10);
  }

  public async marcarFilaProcesada(filaId: number, estado: 'PROCESADA' | 'ERROR'): Promise<void> {
    const query = `
      UPDATE filas_carga_masiva
      SET estado = $1
      WHERE id = $2;
    `;
    await this.pool.query(query, [estado, filaId]);
  }
}
