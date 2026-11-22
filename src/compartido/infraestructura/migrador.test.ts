import fs from 'fs';
import os from 'os';
import path from 'path';
import { Pool, PoolClient } from 'pg';
import { MigradorSql } from './migrador';

describe('MigradorSql', () => {
  let rutaTemporal: string;
  let mockCliente: Partial<PoolClient>;
  let mockPool: Partial<Pool>;

  beforeEach(() => {
    rutaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'migraciones-test-'));

    mockCliente = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockCliente as PoolClient),
    };
  });

  afterEach(() => {
    if (fs.existsSync(rutaTemporal)) {
      fs.rmSync(rutaTemporal, { recursive: true, force: true });
    }
  });

  it('debe inicializar la tabla de control si no existe', async () => {
    const migrador = new MigradorSql(mockPool as Pool);
    await migrador.inicializarTablaControl(mockCliente as PoolClient);

    expect(mockCliente.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS migraciones_control')
    );
  });

  it('debe obtener el conjunto de migraciones ya aplicadas', async () => {
    (mockCliente.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ nombre: '001_inicial.sql' }, { nombre: '002_usuarios.sql' }],
    });

    const migrador = new MigradorSql(mockPool as Pool);
    const resultado = await migrador.obtenerMigracionesAplicadas(mockCliente as PoolClient);

    expect(resultado).toBeInstanceOf(Set);
    expect(resultado.has('001_inicial.sql')).toBe(true);
    expect(resultado.has('002_usuarios.sql')).toBe(true);
    expect(resultado.size).toBe(2);
  });

  it('debe retornar lista vacía si el directorio no existe', () => {
    const migrador = new MigradorSql(mockPool as Pool);
    const archivos = migrador.obtenerArchivosMigracion(path.join(rutaTemporal, 'no-existe'));
    expect(archivos).toEqual([]);
  });

  it('debe filtrar archivos que no terminen en .sql y ordenar numéricamente', () => {
    fs.writeFileSync(path.join(rutaTemporal, '002_usuarios.sql'), '-- sql 2');
    fs.writeFileSync(path.join(rutaTemporal, '001_sedes.sql'), '-- sql 1');
    fs.writeFileSync(path.join(rutaTemporal, '010_reportes.sql'), '-- sql 10');
    fs.writeFileSync(path.join(rutaTemporal, 'README.md'), '# readme');
    fs.writeFileSync(path.join(rutaTemporal, '.gitkeep'), '');

    const migrador = new MigradorSql(mockPool as Pool);
    const archivos = migrador.obtenerArchivosMigracion(rutaTemporal);

    expect(archivos).toEqual(['001_sedes.sql', '002_usuarios.sql', '010_reportes.sql']);
  });

  it('debe aplicar las migraciones pendientes en orden dentro de una transacción', async () => {
    fs.writeFileSync(path.join(rutaTemporal, '001_sedes.sql'), 'CREATE TABLE sedes();');
    fs.writeFileSync(path.join(rutaTemporal, '002_usuarios.sql'), 'CREATE TABLE usuarios();');

    // Mock query responses:
    // 1. inicializarTablaControl
    // 2. obtenerMigracionesAplicadas: solo 001 aplicada
    // 3. BEGIN
    // 4. SQL de 002
    // 5. INSERT 002
    // 6. COMMIT
    (mockCliente.query as jest.Mock)
      .mockResolvedValueOnce({}) // inicializarTablaControl
      .mockResolvedValueOnce({ rows: [{ nombre: '001_sedes.sql' }] }) // ya aplicadas
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // CREATE TABLE usuarios()
      .mockResolvedValueOnce({}) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    const migrador = new MigradorSql(mockPool as Pool);
    const resultado = await migrador.ejecutar({ rutaMigraciones: rutaTemporal });

    expect(resultado.aplicadas).toEqual(['002_usuarios.sql']);
    expect(resultado.totalPendientes).toBe(1);
    expect(mockCliente.query).toHaveBeenCalledWith('BEGIN');
    expect(mockCliente.query).toHaveBeenCalledWith('CREATE TABLE usuarios();');
    expect(mockCliente.query).toHaveBeenCalledWith(
      'INSERT INTO migraciones_control (nombre) VALUES ($1);',
      ['002_usuarios.sql']
    );
    expect(mockCliente.query).toHaveBeenCalledWith('COMMIT');
    expect(mockCliente.release).toHaveBeenCalled();
  });

  it('debe hacer ROLLBACK y lanzar error si falla la ejecución de una migración', async () => {
    fs.writeFileSync(path.join(rutaTemporal, '001_fallida.sql'), 'SYNTAX ERROR;');

    (mockCliente.query as jest.Mock)
      .mockResolvedValueOnce({}) // inicializarTablaControl
      .mockResolvedValueOnce({ rows: [] }) // ya aplicadas
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('syntax error at or near "SYNTAX"')); // error en sql

    const migrador = new MigradorSql(mockPool as Pool);

    await expect(migrador.ejecutar({ rutaMigraciones: rutaTemporal })).rejects.toThrow(
      "Error al ejecutar migración '001_fallida.sql': syntax error at or near \"SYNTAX\""
    );

    expect(mockCliente.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockCliente.release).toHaveBeenCalled();
  });

  it('debe manejar el caso en que no hay migraciones pendientes', async () => {
    (mockCliente.query as jest.Mock)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] });

    const migrador = new MigradorSql(mockPool as Pool);
    const resultado = await migrador.ejecutar({ rutaMigraciones: rutaTemporal });

    expect(resultado.aplicadas).toEqual([]);
    expect(resultado.totalPendientes).toBe(0);
    expect(mockCliente.release).toHaveBeenCalled();
  });
});
