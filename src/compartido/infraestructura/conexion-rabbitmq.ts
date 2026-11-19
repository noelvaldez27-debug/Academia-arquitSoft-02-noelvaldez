import amqp, { ChannelModel, Options } from 'amqplib';

function obtenerVariableEntorno(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || valor.trim() === '') {
    throw new Error(`Variable de entorno requerida no configurada: ${nombre}`);
  }
  return valor;
}

export function obtenerConfiguracionRabbitMQDesdeEnv(): Options.Connect {
  const hostname = obtenerVariableEntorno('RABBITMQ_HOST');
  const puertoStr = obtenerVariableEntorno('RABBITMQ_PORT');
  const username = obtenerVariableEntorno('RABBITMQ_USER');
  const password = obtenerVariableEntorno('RABBITMQ_PASSWORD');
  const vhost = obtenerVariableEntorno('RABBITMQ_VHOST');

  const port = parseInt(puertoStr, 10);
  if (isNaN(port)) {
    throw new Error(`La variable de entorno RABBITMQ_PORT debe ser un número válido: ${puertoStr}`);
  }

  return {
    protocol: 'amqp',
    hostname,
    port,
    username,
    password,
    vhost,
  };
}

export async function crearConexionRabbitMQ(
  configuracion?: Options.Connect | string
): Promise<ChannelModel> {
  const config = configuracion ?? obtenerConfiguracionRabbitMQDesdeEnv();
  return amqp.connect(config);
}

export async function cerrarConexionRabbitMQ(conexion: ChannelModel): Promise<void> {
  await conexion.close();
}
