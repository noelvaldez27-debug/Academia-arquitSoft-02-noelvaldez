import { ejecutarSembradoAdmin } from './seed-admin';
import * as conexionPostgres from '../compartido/infraestructura/conexion-postgres';
import { SembradorAdministradorGeneral } from '../modules/usuarios/aplicacion/sembrar-administrador-general';
import { Pool } from 'pg';

jest.mock('../compartido/infraestructura/conexion-postgres');
jest.mock('../modules/usuarios/infraestructura/postgres-usuario-repository');
jest.mock('../modules/usuarios/infraestructura/bcryptjs-hash.adapter');
jest.mock('../modules/usuarios/aplicacion/sembrar-administrador-general');

describe('Script seed-admin', () => {
  let mockPool: Partial<Pool>;
  let mockSembrar: jest.Mock;

  let codigoSalidaAnterior: typeof process.exitCode;

  afterEach(() => {
    process.exitCode = codigoSalidaAnterior;
  });

  beforeEach(() => {
    codigoSalidaAnterior = process.exitCode;
    jest.clearAllMocks();
    mockPool = {};
    (conexionPostgres.crearPoolPostgres as jest.Mock).mockReturnValue(mockPool);
    (conexionPostgres.cerrarPoolPostgres as jest.Mock).mockResolvedValue(undefined);

    mockSembrar = jest.fn();
    (SembradorAdministradorGeneral as jest.Mock).mockImplementation(() => ({
      sembrar: mockSembrar,
    }));
  });

  it('debe ejecutar el sembrado e imprimir el mensaje devuelto', async () => {
    mockSembrar.mockResolvedValueOnce({
      creado: true,
      mensaje: 'Administrador general inicial creado exitosamente.',
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await ejecutarSembradoAdmin();

    expect(mockSembrar).toHaveBeenCalled();
    expect(conexionPostgres.cerrarPoolPostgres).toHaveBeenCalledWith(mockPool);
    expect(consoleSpy).toHaveBeenCalledWith('Administrador general inicial creado exitosamente.');
    consoleSpy.mockRestore();
  });

  it('debe capturar errores, registrar el fallo y relanzarlo', async () => {
    mockSembrar.mockRejectedValueOnce(new Error('Falta variable requerida'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(ejecutarSembradoAdmin()).rejects.toThrow('Falta variable requerida');
    expect(conexionPostgres.cerrarPoolPostgres).toHaveBeenCalledWith(mockPool);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error al sembrar administrador general:',
      'Falta variable requerida'
    );
    consoleErrorSpy.mockRestore();
  });
});
