import { RedisCacheConsultas } from './redis-cache-consultas';

it('CA-CC01 conserva TTL y deriva a la fuente ante datos ausentes, inválidos o fallos', async () => {
  const redis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const cache = new RedisCacheConsultas(redis);
  const validar = (dato: unknown): dato is string => typeof dato === 'string';
  redis.get.mockResolvedValueOnce(null).mockResolvedValueOnce('{').mockResolvedValueOnce('42')
    .mockRejectedValueOnce(new Error()).mockResolvedValueOnce('"dato"');
  for (let i = 0; i < 4; i++) expect(await cache.leer('k', validar)).toBeUndefined();
  expect(await cache.leer('k', validar)).toBe('dato');
  await cache.guardar('k', 'dato', 3600);
  expect(redis.set).toHaveBeenCalledWith('k', '"dato"', 'EX', 3600);
  redis.set.mockRejectedValueOnce(new Error());
  redis.del.mockRejectedValueOnce(new Error());
  await expect(cache.guardar('k', 'dato', 3600)).resolves.toBeUndefined();
  await expect(cache.eliminar('k')).resolves.toBeUndefined();
});
