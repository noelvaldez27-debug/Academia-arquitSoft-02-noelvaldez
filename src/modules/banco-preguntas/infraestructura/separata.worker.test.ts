import { EventEmitter } from 'node:events';
import * as rabbit from '../../../compartido/infraestructura/conexion-rabbitmq';
import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { Pool } from 'pg';
import { ProcesarSeparataUseCase } from '../aplicacion/procesar-separata.use-case';
import { RabbitmqSeparataAdapter, COLA_SEPARATAS } from './rabbitmq-separata.adapter';
import { SeparataWorker } from './separata.worker';

const id = '12345678-1234-1234-1234-123456789012';

function preparar(intento?: number, cuerpo = JSON.stringify({ separataId: id })) {
  const props = intento === undefined ? {} : { headers: { intento } };
  const mensaje = { content: Buffer.from(cuerpo), properties: props } as unknown as ConsumeMessage;
  const ejecutar = jest.fn();
  const registrarFallo = jest.fn();
  const bd = { query: jest.fn(), release: jest.fn() };
  const conectar = jest.fn().mockResolvedValue(bd);
  const enviar = jest.fn((_cola, _cuerpo, _opciones, confirmar) => confirmar(null));
  const ack = jest.fn();
  const nack = jest.fn();
  const canal = { sendToQueue: enviar, ack, nack } as unknown as ConfirmChannel;
  const worker = new SeparataWorker({ connect: conectar } as unknown as Pool, {} as RabbitmqSeparataAdapter,
    { ejecutar, registrarFallo } as unknown as ProcesarSeparataUseCase);
  return { ejecutar, registrarFallo, conectar, bd, ack, nack, enviar, mensaje,
    consumir: () => worker['consumir'](canal, mensaje) };
}

test.each(['{', '{"separataId":"inválido"}'])('descarta mensajes inválidos antes de acceder a PostgreSQL', async cuerpo => {
  const { consumir, mensaje, conectar, nack } = preparar(undefined, cuerpo);
  await consumir();
  expect(nack).toHaveBeenCalledWith(mensaje, false, false);
  expect(conectar).not.toHaveBeenCalled();
});

test('bloquea la separata y confirma solo después de procesarla', async () => {
  const { consumir, ejecutar, bd, ack, mensaje } = preparar();
  ejecutar.mockImplementation(() => {
    expect(bd.query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_lock('), [id]);
    expect(ack).not.toHaveBeenCalled();
  });
  await consumir();
  expect(ejecutar).toHaveBeenCalledWith(id);
  expect(ack).toHaveBeenCalledWith(mensaje);
  expect(bd.query).toHaveBeenLastCalledWith(expect.stringContaining('pg_advisory_unlock('), [id]);
  expect(bd.release).toHaveBeenCalledWith(false);
});

test('reintenta un fallo transitorio con confirmación persistente antes del ack', async () => {
  const { consumir, ejecutar, enviar, ack, mensaje } = preparar(1);
  ejecutar.mockRejectedValue(new Error('Interrupción'));
  enviar.mockImplementation((_cola, _cuerpo, _opciones, confirmar) => {
    expect(ack).not.toHaveBeenCalled();
    confirmar(null);
  });
  await consumir();
  expect(enviar).toHaveBeenCalledWith(COLA_SEPARATAS + '.reintentos', mensaje.content,
    { persistent: true, headers: { intento: 2 } }, expect.any(Function));
  expect(ack).toHaveBeenCalledWith(mensaje);
});

test('si el broker rechaza el reintento mantiene la entrega sin confirmar y libera el bloqueo', async () => {
  const { consumir, ejecutar, enviar, ack, nack, bd } = preparar(1);
  ejecutar.mockRejectedValue(new Error('Interrupción'));
  enviar.mockImplementation((_cola, _cuerpo, _opciones, confirmar) => confirmar(new Error('Canal cerrado')));
  await expect(consumir()).rejects.toThrow('Canal cerrado');
  expect(ack).not.toHaveBeenCalled();
  expect(nack).not.toHaveBeenCalled();
  expect(bd.release).toHaveBeenCalledWith(false);
});

test('registra el fallo definitivo antes de derivar el mensaje', async () => {
  const { consumir, ejecutar, registrarFallo, nack, mensaje } = preparar(3);
  ejecutar.mockRejectedValue(new Error('Interrupción'));
  registrarFallo.mockImplementation(() => expect(nack).not.toHaveBeenCalled());
  await consumir();
  expect(registrarFallo).toHaveBeenCalledWith(id);
  expect(nack).toHaveBeenCalledWith(mensaje, false, false);
});

test('difiere solo el registro del fallo si PostgreSQL sigue inaccesible', async () => {
  const { consumir, ejecutar, registrarFallo, enviar, mensaje } = preparar(4);
  registrarFallo.mockRejectedValue(new Error('PostgreSQL indisponible'));
  await consumir();
  expect(ejecutar).not.toHaveBeenCalled();
  expect(enviar).toHaveBeenCalledWith(COLA_SEPARATAS + '.reintentos', mensaje.content,
    { persistent: true, headers: { intento: 4 } }, expect.any(Function));
});

test('desecha la conexión si no pudo liberar el bloqueo de la sesión', async () => {
  const { consumir, bd } = preparar();
  bd.query.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Conexión interrumpida'));
  await consumir();
  expect(bd.release).toHaveBeenCalledWith(true);
});

test('declara rutas duraderas de entrega y reintento; cierra la conexión al cancelar el consumidor', async () => {
  const conexion = Object.assign(new EventEmitter(), { close: jest.fn().mockResolvedValue(undefined) });
  const canal = Object.assign(new EventEmitter(), {
    assertQueue: jest.fn(), prefetch: jest.fn(),
    consume: jest.fn((_cola, _callback) => {}),
  });
  const conectar = jest.spyOn(rabbit, 'crearConexionRabbitMQ').mockResolvedValue({
    on: conexion.on.bind(conexion), once: conexion.once.bind(conexion),
    createConfirmChannel: async () => canal, close: conexion.close,
  } as unknown as Awaited<ReturnType<typeof rabbit.crearConexionRabbitMQ>>);
  const publicarPendiente = jest.fn(() => {
    canal.consume.mock.calls[0][1](null);
    throw new Error('Canal cerrado');
  });
  const registrar = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const worker = new SeparataWorker({} as Pool, { publicarPendiente } as unknown as RabbitmqSeparataAdapter,
      {} as ProcesarSeparataUseCase);
    await worker['conectar']();
    expect(canal.assertQueue).toHaveBeenCalledWith(COLA_SEPARATAS + '.reintentos', expect.objectContaining({
      durable: true, messageTtl: 5000, deadLetterRoutingKey: COLA_SEPARATAS,
    }));
    expect(canal.assertQueue).toHaveBeenCalledWith(COLA_SEPARATAS, expect.objectContaining({
      durable: true, deadLetterRoutingKey: COLA_SEPARATAS + '.fallos',
    }));
    expect(canal.prefetch).toHaveBeenCalledWith(1);
    expect(conexion.close).toHaveBeenCalledTimes(1);
  } finally {
    conectar.mockRestore();
    registrar.mockRestore();
  }
});
