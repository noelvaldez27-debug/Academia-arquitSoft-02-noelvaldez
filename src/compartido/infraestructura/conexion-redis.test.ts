import Redis from 'ioredis';
import {
  crearClienteRedis,
  cerrarClienteRedis,
  obtenerConfiguracionRedisDesdeEnv,
} from './conexion-redis';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation((config) => {
    return {
      status: 'ready',
      options: config,
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    };
  });
});

describe('Conexión Redis', () => {
  const envOriginal = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...envOriginal };
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  describe('obtenerConfiguracionRedisDesdeEnv', () => {
    it('debe leer y parsear correctamente las variables de entorno', () => {
      process.env.REDIS_HOST = 'redis.host.local';
      process.env.REDIS_PORT = '6379';
      process.env.REDIS_PASSWORD = 'password_redis_test';

      const config = obtenerConfiguracionRedisDesdeEnv();

      expect(config).toEqual({
        host: 'redis.host.local',
        port: 6379,
        password: 'password_redis_test',
      });
    });

    it('debe fallar si falta REDIS_HOST', () => {
      delete process.env.REDIS_HOST;
      process.env.REDIS_PORT = '6379';
      process.env.REDIS_PASSWORD = 'password_redis_test';

      expect(() => obtenerConfiguracionRedisDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: REDIS_HOST'
      );
    });

    it('debe fallar si falta REDIS_PORT', () => {
      process.env.REDIS_HOST = 'localhost';
      delete process.env.REDIS_PORT;
      process.env.REDIS_PASSWORD = 'password_redis_test';

      expect(() => obtenerConfiguracionRedisDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: REDIS_PORT'
      );
    });

    it('debe fallar si REDIS_PORT no es un número válido', () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = 'puerto_invalido';
      process.env.REDIS_PASSWORD = 'password_redis_test';

      expect(() => obtenerConfiguracionRedisDesdeEnv()).toThrow(
        'La variable de entorno REDIS_PORT debe ser un número válido: puerto_invalido'
      );
    });

    it('debe fallar si falta REDIS_PASSWORD', () => {
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      delete process.env.REDIS_PASSWORD;

      expect(() => obtenerConfiguracionRedisDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: REDIS_PASSWORD'
      );
    });
  });

  describe('crearClienteRedis', () => {
    it('debe instanciar Redis con la configuración provista directamente', () => {
      const configManual = {
        host: 'redis.custom',
        port: 6380,
        password: 'secret_manual',
      };

      const cliente = crearClienteRedis(configManual);

      expect(Redis).toHaveBeenCalledWith(configManual);
      expect(cliente).toBeDefined();
    });

    it('debe instanciar Redis usando las variables de entorno si no se provee configuración', () => {
      process.env.REDIS_HOST = 'redis.env';
      process.env.REDIS_PORT = '6379';
      process.env.REDIS_PASSWORD = 'secret_env';

      const cliente = crearClienteRedis();

      expect(Redis).toHaveBeenCalledWith({
        host: 'redis.env',
        port: 6379,
        password: 'secret_env',
      });
      expect(cliente).toBeDefined();
    });
  });

  describe('cerrarClienteRedis', () => {
    it('debe llamar a quit si el estado no es end', async () => {
      const cliente = crearClienteRedis({ host: 'localhost' });
      await cerrarClienteRedis(cliente);

      expect(cliente.quit).toHaveBeenCalledTimes(1);
    });

    it('no debe llamar a quit si el estado ya es end', async () => {
      const cliente = crearClienteRedis({ host: 'localhost' });
      (cliente as unknown as { status: string }).status = 'end';
      await cerrarClienteRedis(cliente);

      expect(cliente.quit).not.toHaveBeenCalled();
    });
  });
});
