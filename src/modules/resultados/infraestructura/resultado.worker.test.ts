import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { ResultadoWorker } from './resultado.worker';

function preparar() {
  const procesar = jest.fn();
  const informar = jest.fn();
  const pausa = jest.fn();
  const worker = new ResultadoWorker(jest.fn(), procesar, informar, pausa);
  const ack = jest.fn();
  const sendToQueue = jest.fn();
  const canal = { ack, sendToQueue } as unknown as ConfirmChannel;
  const mensaje = { content: Buffer.from('{"tipo":"ExamenFinalizado","examenId":"e"}'),
    properties: { messageId: 'e', headers: {} } } as ConsumeMessage;
  return { worker, procesar, informar, pausa, ack, sendToQueue, canal, mensaje };
}

it('CA-PR04 confirma solo después del procesamiento', async () => {
  const { worker, canal, mensaje, ack, procesar, sendToQueue } = preparar();
  procesar.mockImplementation(async () => expect(ack).not.toHaveBeenCalled());
  await worker.consumir(canal, mensaje);
  expect(procesar).toHaveBeenCalledWith('e');
  expect(ack).toHaveBeenCalledWith(mensaje);
  expect(sendToQueue).not.toHaveBeenCalled();
});

it('CA-PR04 espera confirmación del reintento y conserva el original si el broker falla', async () => {
  const { worker, canal, mensaje, ack, procesar, sendToQueue, pausa } = preparar();
  procesar.mockRejectedValue(new Error('BD'));
  sendToQueue.mockImplementation((_cola, _datos, _opciones, confirmar) => {
    expect(ack).not.toHaveBeenCalled();
    confirmar(new Error('broker'));
  });
  await expect(worker.consumir(canal, mensaje)).rejects.toThrow('broker');
  expect(pausa).toHaveBeenCalledWith(1000);
  expect(sendToQueue).toHaveBeenCalledWith('examen.finalizado', mensaje.content,
    expect.objectContaining({ headers: { intento: 1 }, persistent: true }), expect.any(Function));
  expect(ack).not.toHaveBeenCalled();
});

it('CA-PR04 conserva entregas agotadas y mensajes inválidos en una cola durable', async () => {
  const { worker, canal, mensaje, ack, procesar, sendToQueue, pausa } = preparar();
  procesar.mockRejectedValueOnce(new Error('BD'));
  sendToQueue.mockImplementation((_cola, _datos, _opciones, confirmar) => confirmar(null));
  mensaje.properties.headers = { intento: 3 };
  await worker.consumir(canal, mensaje);
  await worker.consumir(canal, { ...mensaje, content: Buffer.from('{') });
  expect(procesar).toHaveBeenCalledTimes(1);
  expect(sendToQueue.mock.calls.map(([cola]) => cola)).toEqual(['examen.finalizado.fallos', 'examen.finalizado.fallos']);
  expect(ack).toHaveBeenCalledTimes(2);
  expect(pausa).not.toHaveBeenCalled();
});
