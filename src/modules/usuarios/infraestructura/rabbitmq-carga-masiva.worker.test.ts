import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { Pool } from 'pg';
import { ProcesarCargaMasivaUseCase } from '../aplicacion/procesar-carga-masiva.use-case';
import { RabbitmqCargaMasivaWorker } from './rabbitmq-carga-masiva.worker';

function preparar(intento = 0) {
  const mensaje = {
    content: Buffer.from(JSON.stringify({ cargaId: '12345678-1234-1234-1234-123456789012', numeroLote: 1 })),
    properties: { headers: { intento } },
  } as unknown as ConsumeMessage;
  const ejecutar = jest.fn();
  const marcarFallida = jest.fn();
  const ack = jest.fn();
  const nack = jest.fn();
  const sendToQueue = jest.fn((_cola, _contenido, _opciones, confirmar) => confirmar(null));
  const canal = { ack, nack, sendToQueue } as unknown as ConfirmChannel;
  const worker = new RabbitmqCargaMasivaWorker({} as Pool, {
    ejecutar, marcarFallida,
  } as unknown as ProcesarCargaMasivaUseCase);
  return { mensaje, ejecutar, marcarFallida, ack, nack, sendToQueue, consumir: () => worker['consumir'](canal, mensaje) };
}

describe('RabbitmqCargaMasivaWorker (ADR-016)', () => {
  it('confirma la entrega después de procesar el lote', async () => {
    const { ack, ejecutar, mensaje, consumir } = preparar();
    ejecutar.mockImplementation(() => expect(ack).not.toHaveBeenCalled());
    await consumir();
    expect(ack).toHaveBeenCalledWith(mensaje);
  });

  it('publica el reintento con confirmación del broker antes de confirmar la entrega original', async () => {
    const { ack, ejecutar, sendToQueue, mensaje, consumir } = preparar();
    ejecutar.mockRejectedValue(new Error('Fallo transitorio'));
    sendToQueue.mockImplementation((_cola, _contenido, _opciones, confirmar) => {
      expect(ack).not.toHaveBeenCalled();
      confirmar(null);
    });
    await consumir();
    expect(sendToQueue).toHaveBeenCalledWith(
      'usuarios.carga-masiva.reintentos', mensaje.content,
      { persistent: true, headers: { intento: 1 } }, expect.any(Function),
    );
    expect(ack).toHaveBeenCalledWith(mensaje);
  });

  it('registra el fallo y deriva el mensaje cuando se agotan los reintentos', async () => {
    const { nack, ejecutar, marcarFallida, mensaje, consumir } = preparar(3);
    ejecutar.mockRejectedValue(new Error('Fallo persistente'));
    await consumir();
    expect(marcarFallida).toHaveBeenCalledWith(expect.objectContaining({ numeroLote: 1 }));
    expect(nack).toHaveBeenCalledWith(mensaje, false, false);
  });
});

it('mantiene el envío pendiente si RabbitMQ no confirma la publicación', async () => {
  const query = jest.fn().mockResolvedValueOnce({
    rows: [{ carga_id: 'carga', numero_lote: 1 }],
  });
  const canal = {
    sendToQueue: jest.fn((_cola, _contenido, _opciones, confirmar) => confirmar(new Error('Canal cerrado'))),
  } as unknown as ConfirmChannel;
  const worker = new RabbitmqCargaMasivaWorker({ query } as unknown as Pool, {} as ProcesarCargaMasivaUseCase);

  await expect(worker['publicarPendientes'](canal)).rejects.toThrow('Canal cerrado');
  expect(query).toHaveBeenCalledTimes(1);
  expect(query.mock.calls[0][0]).toContain('WHERE NOT publicado');
});
