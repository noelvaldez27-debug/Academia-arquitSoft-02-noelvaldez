import { ejecutarMigraciones } from './migrar';
import * as conexionPostgres from '../compartido/infraestructura/conexion-postgres';
import { MigradorSql } from '../compartido/infraestructura/migrador';
import { Pool } from 'pg';

jest.mock('../compartido/infraestructura/conexion-postgres');
jest.mock('../compartido/infraestructura/migrador');

describe('Script migrar', () => {
  let mockPool: Partial<Pool>;
  let mockEjecutar: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = {};
    (conexionPostgres.crearPoolPostgres as jest.Mock).mockReturnValue(mockPool);
    (conexionPostgres.cerrarPoolPostgres as jest.Mock).mockResolvedValue(undefined);

    mockEjecutar = jest.fn();
    (MigradorSql as jest.Mock).mockImplementation(() => ({
      ejecutar: mockEjecutar,
    }));
  });

  it('debe ejecutar las migraciones e informar si no hay pendientes', async () => {
    mockEjecutar.mockResolvedValueOnce({
      aplicadas: [],
      totalPendientes: 0,
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await ejecutarMigraciones('/ruta/test');

    expect(mockEjecutar).toHaveBeenCalledWith({ rutaMigraciones: '/ruta/test' });
    expect(conexionPostgres.cerrarPoolPostgres).toHaveBeenCalledWith(mockPool);
    expect(consoleSpy).toHaveBeenCalledWith('No hay migraciones pendientes. Base de datos al día.');
    consoleSpy.mockRestore();
  });

  it('debe listar las migraciones aplicadas cuando se ejecutan con éxito', async () => {
    mockEjecutar.mockResolvedValueOnce({
      aplicadas: ['001_inicial.sql'],
      totalPendientes: 1,
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await ejecutarMigraciones('/ruta/test');

    expect(consoleSpy).toHaveBeenCalledWith('Se aplicaron 1 migraciones exitosamente:');
    expect(consoleSpy).toHaveBeenCalledWith(' - 001_inicial.sql');
    consoleSpy.mockRestore();
  });

  it('debe capturar errores, cerrar el pool y relanzar el error', async () => {
    mockEjecutar.mockRejectedValueOnce(new Error('Fallo de conexión'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(ejecutarMigraciones('/ruta/test')).rejects.toThrow('Fallo de conexión');
    expect(conexionPostgres.cerrarPoolPostgres).toHaveBeenCalledWith(mockPool);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Fallo en la ejecución de migraciones:',
      'Fallo de conexión'
    );
    consoleErrorSpy.mockRestore();
  });
});
