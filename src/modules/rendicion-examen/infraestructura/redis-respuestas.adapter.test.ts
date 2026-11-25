import { RedisRespuestasAdapter } from './redis-respuestas.adapter';

const comando = { numero: 1, alternativa: null, revisionBase: 2, operacionId: 'op' };

it('CA-RE03 conserva borrados y devuelve el orden de las marcas confirmadas', async () => {
  const hset = jest.fn();
  const hgetall = jest.fn().mockResolvedValueOnce({
    activo: '1',
    'operacion:op': '{}',
    'marca:2': '{"numero":2,"alternativa":"E","revision":1}',
    'marca:1': '{"numero":1,"alternativa":null,"revision":3}',
  }).mockResolvedValueOnce({});
  const adapter = new RedisRespuestasAdapter({ hset, hgetall, eval: jest.fn() });
  await adapter.inicializar('examen');
  expect(hset).toHaveBeenCalledWith('rendicion:examen:examen', 'activo', '1');
  expect((await adapter.listar('examen')).map(marca => marca.alternativa)).toEqual([null, 'E']);
  await expect(adapter.listar('examen')).rejects.toThrow('respuestas temporales');
});

it.each(['vencido', 'conflicto', 'cerrado', 'sin-sesion'])('CA-RE03 traduce la respuesta atómica %s', async estado => {
  const adapter = new RedisRespuestasAdapter({ hset: jest.fn(), hgetall: jest.fn(), eval: jest.fn().mockResolvedValue([estado]) });
  await expect(adapter.registrar('examen', new Date(), comando)).rejects.toThrow();
});

it('CA-RE03 devuelve la revisión confirmada por Redis', async () => {
  const respuesta = { numero: 1, alternativa: null, revision: 3 };
  const ejecutar = jest.fn().mockResolvedValue(['ok', JSON.stringify(respuesta)]);
  const adapter = new RedisRespuestasAdapter({ hset: jest.fn(), hgetall: jest.fn(), eval: ejecutar });
  expect(await adapter.registrar('examen', new Date(7), comando)).toEqual(respuesta);
  expect(ejecutar).toHaveBeenCalledWith(expect.any(String), 1, 'rendicion:examen:examen', 7,
    'operacion:op', 'marca:1', JSON.stringify(comando));
});
