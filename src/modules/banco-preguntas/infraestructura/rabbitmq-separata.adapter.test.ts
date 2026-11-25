import { ConfirmChannel } from 'amqplib';
import { Pool } from 'pg';
import { COLA_SEPARATAS, RabbitmqSeparataAdapter } from './rabbitmq-separata.adapter';

function preparar() {
  const bd = { query: jest.fn(), release: jest.fn() };
  bd.query.mockResolvedValue({}).mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ separata_id: 's' }] });
  const adapter = new RabbitmqSeparataAdapter({ connect: async () => bd } as unknown as Pool);
  const enviar = jest.fn();
  return { bd, adapter, enviar, canal: { sendToQueue: enviar } as unknown as ConfirmChannel };
}

test('ADR-009 marca la publicación solo después de la confirmación del broker', async () => {
  const { bd, adapter, enviar, canal } = preparar();
  enviar.mockImplementation((cola, mensaje, opciones, confirmar) => {
    expect(cola).toBe(COLA_SEPARATAS);
    expect(JSON.parse(mensaje.toString())).toEqual({ separataId: 's' });
    expect(opciones.persistent).toBe(true);
    expect(bd.query).toHaveBeenCalledTimes(2);
    confirmar(null);
  });
  await adapter.publicarPendiente(canal);
  expect(bd.query).toHaveBeenNthCalledWith(3, expect.stringContaining('SET publicado = true'), ['s']);
  expect(bd.query).toHaveBeenLastCalledWith('COMMIT');
});

test('ADR-009 conserva el envío pendiente si RabbitMQ rechaza la publicación', async () => {
  const { bd, adapter, enviar, canal } = preparar();
  enviar.mockImplementation((_cola, _mensaje, _opciones, confirmar) => confirmar(new Error('Canal cerrado')));
  await expect(adapter.publicarPendiente(canal)).rejects.toThrow('Canal cerrado');
  expect(bd.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(bd.release).toHaveBeenCalledTimes(1);
});
