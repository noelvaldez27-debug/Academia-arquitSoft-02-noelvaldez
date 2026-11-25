import { EventEmitter } from 'node:events';
import type { ChannelModel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { RankingWorker } from './ranking.worker';

it('CA-RR02 confirma tras persistir y vuelve a programar cuando la proyección falla', async () => {
  let recibir: (mensaje: ConsumeMessage | null) => void;
  let completado = false;
  const mensaje = { content: Buffer.from('simulacro') } as ConsumeMessage;
  const fallar = new Error('PostgreSQL no disponible');
  const actualizar = jest.fn().mockRejectedValueOnce(fallar).mockImplementation(async () => { completado = true; });
  const informar = jest.fn();
  const canal = Object.assign(new EventEmitter(), {
    assertQueue: jest.fn(), prefetch: jest.fn(),
    consume: (_cola: string, callback: typeof recibir) => { recibir = callback; },
    ack: jest.fn(() => expect(completado).toBe(true)),
    nack: jest.fn(() => expect(completado).toBe(false)),
    sendToQueue: (_cola: string, _datos: Buffer, _opciones: unknown, confirmar: (error: null) => void) => {
      confirmar(null);
      recibir(mensaje);
      return true;
    },
  });
  const conexion = Object.assign(new EventEmitter(), {
    createConfirmChannel: async () => canal as unknown as ConfirmChannel,
    close: jest.fn().mockResolvedValue(undefined),
  });
  const worker = new RankingWorker(async () => conexion as unknown as ChannelModel,
    async () => completado ? [] : ['simulacro'], actualizar, informar, async () => {
      await new Promise<void>(resolver => setImmediate(resolver));
      if (completado) conexion.emit('close');
    });
  await worker.sesion();
  expect(canal.assertQueue).toHaveBeenCalledWith('ranking.actualizar', { durable: true });
  expect(canal.nack).toHaveBeenCalledWith(mensaje, false, false);
  expect(canal.ack).toHaveBeenCalledWith(mensaje);
  expect(informar).toHaveBeenCalledWith(fallar);
  expect(actualizar.mock.calls).toEqual([['simulacro'], ['simulacro']]);
});
