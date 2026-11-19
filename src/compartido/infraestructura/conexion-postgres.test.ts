import { Pool } from 'pg';
import {
  crearPoolPostgres,
  cerrarPoolPostgres,
  obtenerConfiguracionPostgresDesdeEnv,
} from './conexion-postgres';

jest.mock('pg', () => {
  const mPool = {
    end: jest.fn().mockResolvedValue(undefined),
  };
  return {
    Pool: jest.fn(() => mPool),
  };
});

describe('Conexión PostgreSQL', () => {
  const envOriginal = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...envOriginal };
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  describe('obtenerConfiguracionPostgresDesdeEnv', () => {
    it('debe leer y parsear correctamente las variables de entorno', () => {
      process.env.DB_HOST = 'postgres.host.local';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'db_test';
      process.env.DB_USER = 'usuario_test';
      process.env.DB_PASSWORD = 'password_test';

      const config = obtenerConfiguracionPostgresDesdeEnv();

      expect(config).toEqual({
        host: 'postgres.host.local',
        port: 5432,
        database: 'db_test',
        user: 'usuario_test',
        password: 'password_test',
      });
    });

    it('debe fallar si falta DB_HOST', () => {
      delete process.env.DB_HOST;
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'db_test';
      process.env.DB_USER = 'user';
      process.env.DB_PASSWORD = 'pass';

      expect(() => obtenerConfiguracionPostgresDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: DB_HOST'
      );
    });

    it('debe fallar si falta DB_PORT', () => {
      process.env.DB_HOST = 'localhost';
      delete process.env.DB_PORT;
      process.env.DB_NAME = 'db_test';
      process.env.DB_USER = 'user';
      process.env.DB_PASSWORD = 'pass';

      expect(() => obtenerConfiguracionPostgresDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: DB_PORT'
      );
    });

    it('debe fallar si DB_PORT no es un número válido', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = 'invalido';
      process.env.DB_NAME = 'db_test';
      process.env.DB_USER = 'user';
      process.env.DB_PASSWORD = 'pass';

      expect(() => obtenerConfiguracionPostgresDesdeEnv()).toThrow(
        'La variable de entorno DB_PORT debe ser un número válido: invalido'
      );
    });

    it('debe fallar si falta DB_NAME', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      delete process.env.DB_NAME;
      process.env.DB_USER = 'user';
      process.env.DB_PASSWORD = 'pass';

      expect(() => obtenerConfiguracionPostgresDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: DB_NAME'
      );
    });

    it('debe fallar si falta DB_USER', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'db_test';
      delete process.env.DB_USER;
      process.env.DB_PASSWORD = 'pass';

      expect(() => obtenerConfiguracionPostgresDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: DB_USER'
      );
    });

    it('debe fallar si falta DB_PASSWORD', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'db_test';
      process.env.DB_USER = 'user';
      delete process.env.DB_PASSWORD;

      expect(() => obtenerConfiguracionPostgresDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: DB_PASSWORD'
      );
    });
  });

  describe('crearPoolPostgres', () => {
    it('debe instanciar Pool con la configuración provista directamente', () => {
      const configManual = {
        host: 'servidor-remoto',
        port: 5433,
        database: 'db_manual',
        user: 'usuario_manual',
        password: 'clave_manual',
      };

      const pool = crearPoolPostgres(configManual);

      expect(Pool).toHaveBeenCalledWith(configManual);
      expect(pool).toBeDefined();
    });

    it('debe instanciar Pool usando las variables de entorno si no se provee configuración', () => {
      process.env.DB_HOST = 'postgres.env';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'db_env';
      process.env.DB_USER = 'user_env';
      process.env.DB_PASSWORD = 'pass_env';

      const pool = crearPoolPostgres();

      expect(Pool).toHaveBeenCalledWith({
        host: 'postgres.env',
        port: 5432,
        database: 'db_env',
        user: 'user_env',
        password: 'pass_env',
      });
      expect(pool).toBeDefined();
    });
  });

  describe('cerrarPoolPostgres', () => {
    it('debe llamar al método end del pool', async () => {
      const pool = crearPoolPostgres({ host: 'localhost' });
      await cerrarPoolPostgres(pool);

      expect(pool.end).toHaveBeenCalledTimes(1);
    });
  });
});
