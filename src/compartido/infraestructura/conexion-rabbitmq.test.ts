import amqp, { ChannelModel } from 'amqplib';
import {
  crearConexionRabbitMQ,
  cerrarConexionRabbitMQ,
  obtenerConfiguracionRabbitMQDesdeEnv,
} from './conexion-rabbitmq';

jest.mock('amqplib', () => {
  const mConn = {
    close: jest.fn().mockResolvedValue(undefined),
  };
  return {
    connect: jest.fn().mockResolvedValue(mConn),
  };
});

describe('Conexión RabbitMQ', () => {
  const envOriginal = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...envOriginal };
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  describe('obtenerConfiguracionRabbitMQDesdeEnv', () => {
    it('debe leer y parsear correctamente las variables de entorno', () => {
      process.env.RABBITMQ_HOST = 'rabbit.host.local';
      process.env.RABBITMQ_PORT = '5672';
      process.env.RABBITMQ_USER = 'rabbit_user_test';
      process.env.RABBITMQ_PASSWORD = 'rabbit_pass_test';
      process.env.RABBITMQ_VHOST = '/vhost_test';

      const config = obtenerConfiguracionRabbitMQDesdeEnv();

      expect(config).toEqual({
        protocol: 'amqp',
        hostname: 'rabbit.host.local',
        port: 5672,
        username: 'rabbit_user_test',
        password: 'rabbit_pass_test',
        vhost: '/vhost_test',
      });
    });

    it('debe fallar si falta RABBITMQ_HOST', () => {
      delete process.env.RABBITMQ_HOST;
      process.env.RABBITMQ_PORT = '5672';
      process.env.RABBITMQ_USER = 'user';
      process.env.RABBITMQ_PASSWORD = 'pass';
      process.env.RABBITMQ_VHOST = '/';

      expect(() => obtenerConfiguracionRabbitMQDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: RABBITMQ_HOST'
      );
    });

    it('debe fallar si falta RABBITMQ_PORT', () => {
      process.env.RABBITMQ_HOST = 'localhost';
      delete process.env.RABBITMQ_PORT;
      process.env.RABBITMQ_USER = 'user';
      process.env.RABBITMQ_PASSWORD = 'pass';
      process.env.RABBITMQ_VHOST = '/';

      expect(() => obtenerConfiguracionRabbitMQDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: RABBITMQ_PORT'
      );
    });

    it('debe fallar si RABBITMQ_PORT no es un número válido', () => {
      process.env.RABBITMQ_HOST = 'localhost';
      process.env.RABBITMQ_PORT = 'no_es_numero';
      process.env.RABBITMQ_USER = 'user';
      process.env.RABBITMQ_PASSWORD = 'pass';
      process.env.RABBITMQ_VHOST = '/';

      expect(() => obtenerConfiguracionRabbitMQDesdeEnv()).toThrow(
        'La variable de entorno RABBITMQ_PORT debe ser un número válido: no_es_numero'
      );
    });

    it('debe fallar si falta RABBITMQ_USER', () => {
      process.env.RABBITMQ_HOST = 'localhost';
      process.env.RABBITMQ_PORT = '5672';
      delete process.env.RABBITMQ_USER;
      process.env.RABBITMQ_PASSWORD = 'pass';
      process.env.RABBITMQ_VHOST = '/';

      expect(() => obtenerConfiguracionRabbitMQDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: RABBITMQ_USER'
      );
    });

    it('debe fallar si falta RABBITMQ_PASSWORD', () => {
      process.env.RABBITMQ_HOST = 'localhost';
      process.env.RABBITMQ_PORT = '5672';
      process.env.RABBITMQ_USER = 'user';
      delete process.env.RABBITMQ_PASSWORD;
      process.env.RABBITMQ_VHOST = '/';

      expect(() => obtenerConfiguracionRabbitMQDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: RABBITMQ_PASSWORD'
      );
    });

    it('debe fallar si falta RABBITMQ_VHOST', () => {
      process.env.RABBITMQ_HOST = 'localhost';
      process.env.RABBITMQ_PORT = '5672';
      process.env.RABBITMQ_USER = 'user';
      process.env.RABBITMQ_PASSWORD = 'pass';
      delete process.env.RABBITMQ_VHOST;

      expect(() => obtenerConfiguracionRabbitMQDesdeEnv()).toThrow(
        'Variable de entorno requerida no configurada: RABBITMQ_VHOST'
      );
    });
  });

  describe('crearConexionRabbitMQ', () => {
    it('debe llamar a amqp.connect con la configuración provista directamente', async () => {
      const configManual = {
        protocol: 'amqp',
        hostname: 'rabbit.custom',
        port: 5673,
        username: 'user_custom',
        password: 'pass_custom',
        vhost: '/vhost_custom',
      };

      const conn = await crearConexionRabbitMQ(configManual);

      expect(amqp.connect).toHaveBeenCalledWith(configManual);
      expect(conn).toBeDefined();
    });

    it('debe llamar a amqp.connect usando las variables de entorno si no se provee configuración', async () => {
      process.env.RABBITMQ_HOST = 'rabbit.env';
      process.env.RABBITMQ_PORT = '5672';
      process.env.RABBITMQ_USER = 'user_env';
      process.env.RABBITMQ_PASSWORD = 'pass_env';
      process.env.RABBITMQ_VHOST = '/vhost_env';

      const conn = await crearConexionRabbitMQ();

      expect(amqp.connect).toHaveBeenCalledWith({
        protocol: 'amqp',
        hostname: 'rabbit.env',
        port: 5672,
        username: 'user_env',
        password: 'pass_env',
        vhost: '/vhost_env',
      });
      expect(conn).toBeDefined();
    });
  });

  describe('cerrarConexionRabbitMQ', () => {
    it('debe llamar al método close de la conexión', async () => {
      const conn = (await crearConexionRabbitMQ({ hostname: 'localhost' })) as ChannelModel;
      await cerrarConexionRabbitMQ(conn);

      expect(conn.close).toHaveBeenCalledTimes(1);
    });
  });
});
