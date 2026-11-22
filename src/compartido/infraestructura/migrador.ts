import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';

export interface OpcionesMigrador {
  rutaMigraciones?: string;
}

export interface ResultadoMigracion {
  aplicadas: string[];
  totalPendientes: number;
}

/**
 * Migrador SQL simple para PostgreSQL (ADR-015).
 * Aplica archivos .sql numerados en orden y registra cada migración en la tabla migraciones_control.
 */
export class MigradorSql {
  constructor(private readonly pool: Pool) {}

  public async inicializarTablaControl(cliente: PoolClient): Promise<void> {
    await cliente.query(`
      CREATE TABLE IF NOT EXISTS migraciones_control (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE,
        aplicada_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  public async obtenerMigracionesAplicadas(cliente: PoolClient): Promise<Set<string>> {
    const res = await cliente.query<{ nombre: string }>('SELECT nombre FROM migraciones_control;');
    return new Set(res.rows.map((r) => r.nombre));
  }

  public obtenerArchivosMigracion(directorio: string): string[] {
    if (!fs.existsSync(directorio)) {
      return [];
    }
    return fs
      .readdirSync(directorio)
      .filter((archivo) => archivo.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  public async ejecutar(opciones?: OpcionesMigrador): Promise<ResultadoMigracion> {
    const ruta = opciones?.rutaMigraciones ?? path.resolve(process.cwd(), 'migraciones');
    const archivos = this.obtenerArchivosMigracion(ruta);

    const cliente = await this.pool.connect();
    const aplicadas: string[] = [];

    try {
      await this.inicializarTablaControl(cliente);
      const yaAplicadas = await this.obtenerMigracionesAplicadas(cliente);
      const pendientes = archivos.filter((archivo) => !yaAplicadas.has(archivo));

      for (const archivo of pendientes) {
        const rutaCompleta = path.join(ruta, archivo);
        const contenidoSql = fs.readFileSync(rutaCompleta, 'utf-8');

        await cliente.query('BEGIN');
        try {
          await cliente.query(contenidoSql);
          await cliente.query('INSERT INTO migraciones_control (nombre) VALUES ($1);', [archivo]);
          await cliente.query('COMMIT');
          aplicadas.push(archivo);
        } catch (error) {
          await cliente.query('ROLLBACK');
          throw new Error(`Error al ejecutar migración '${archivo}': ${(error as Error).message}`);
        }
      }

      return {
        aplicadas,
        totalPendientes: pendientes.length,
      };
    } finally {
      cliente.release();
    }
  }
}
