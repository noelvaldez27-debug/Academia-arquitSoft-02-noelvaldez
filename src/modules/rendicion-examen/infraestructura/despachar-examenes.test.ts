import { ChannelModel } from 'amqplib';
import { Pool } from 'pg';
import { RespuestasTemporales } from '../aplicacion/respuestas-temporales.port';
import { DespacharExamenes } from './despachar-examenes';
import { RabbitmqExamenAdapter } from './rabbitmq-examen.adapter';

it('CA-RE05 conserva el evento ante caída del broker y limpia la sesión tras la confirmación', async () => {
  const query = jest.fn().mockResolvedValue({ rows: [{ id: 'e', publicado: false }] });
  const publicar = jest.fn().mockRejectedValueOnce(new Error('broker caído'));
  const limpiar = jest.fn().mockRejectedValueOnce(new Error('redis caído'));
  const despachar = new DespacharExamenes({ query } as unknown as Pool, { publicar }, { limpiar } as unknown as RespuestasTemporales);
  await expect(despachar.ejecutar(10)).rejects.toThrow('broker caído');
  expect(query).toHaveBeenCalledTimes(1);
  expect(limpiar).not.toHaveBeenCalled();

  await despachar.ejecutar(10);
  expect(query).toHaveBeenCalledWith('UPDATE envios_examen_finalizado SET publicado = true WHERE examen_id = $1', ['e']);
  expect(query).not.toHaveBeenCalledWith(expect.stringMatching(/^DELETE/), ['e']);
  query.mockResolvedValueOnce({ rows: [{ id: 'e', publicado: true }] });
  await despachar.ejecutar(10);
  expect(publicar).toHaveBeenCalledTimes(2);
  expect(query).toHaveBeenCalledWith('DELETE FROM envios_examen_finalizado WHERE examen_id = $1', ['e']);
});

it('CA-RE05 publica un mensaje persistente y espera confirmación del broker', async () => {
  const canal = { on: jest.fn(), assertQueue: jest.fn(), sendToQueue: jest.fn(), waitForConfirms: jest.fn() };
  const conexion = { on: jest.fn(), close: jest.fn().mockResolvedValue(undefined), createConfirmChannel: async () => canal };
  const publicar = new RabbitmqExamenAdapter(async () => conexion as unknown as ChannelModel);
  await publicar.publicar('e');
  expect(canal.assertQueue).toHaveBeenCalledWith('examen.finalizado', { durable: true });
  expect(canal.sendToQueue).toHaveBeenCalledWith('examen.finalizado', Buffer.from('{"tipo":"ExamenFinalizado","examenId":"e"}'),
    expect.objectContaining({ persistent: true, messageId: 'e' }));
  expect(canal.waitForConfirms).toHaveBeenCalled();
  expect(conexion.close).toHaveBeenCalled();
});

it('CA-RE05 un lote fallido conserva todas las filas y no limpia Redis', async () => {
  const query = jest.fn().mockResolvedValue({ rows: [{ id: 'e1', publicado: false }, { id: 'e2', publicado: false }] });
  const publicarLote = jest.fn().mockRejectedValueOnce(new Error('Confirmación incompleta'));
  const limpiar = jest.fn().mockResolvedValue(undefined);
  const tarea = new DespacharExamenes({ query } as unknown as Pool, { publicarLote, publicar: jest.fn() },
    { limpiar } as unknown as RespuestasTemporales);
  await expect(tarea.ejecutar(10)).rejects.toThrow('Confirmación incompleta');
  expect(query).toHaveBeenCalledTimes(1);
  expect(limpiar).not.toHaveBeenCalled();
  await tarea.ejecutar(10);
  expect(publicarLote.mock.calls).toEqual([[['e1', 'e2']], [['e1', 'e2']]]);
  expect(query).toHaveBeenCalledWith(expect.stringContaining('= ANY($1::text[])'), [['e1', 'e2']]);
  expect(limpiar.mock.calls).toEqual([['e1'], ['e2']]);
});

it('CA-RE05 comparte conexión, canal y confirmación para publicar varios cierres', async () => {
  const canal = { on: jest.fn(), assertQueue: jest.fn(), sendToQueue: jest.fn(), waitForConfirms: jest.fn() };
  const conexion = { on: jest.fn(), close: jest.fn().mockResolvedValue(undefined), createConfirmChannel: async () => canal };
  const conectar = jest.fn().mockResolvedValue(conexion);
  await new RabbitmqExamenAdapter(conectar).publicarLote(['e1', 'e2']);
  expect(conectar).toHaveBeenCalledTimes(1);
  expect(canal.sendToQueue).toHaveBeenCalledTimes(2);
  expect(canal.waitForConfirms).toHaveBeenCalledTimes(1);
});
