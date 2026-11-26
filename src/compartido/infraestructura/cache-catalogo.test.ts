import type { Pool } from 'pg';
import { consultarCatalogo } from './cache-catalogo';
import { RedisCacheConsultas } from './redis-cache-consultas';

it('CA-CC02 no publica una lectura si la generación avanza concurrentemente', async () => {
  const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
  const cache = new RedisCacheConsultas(redis);
  const fila = { id: 1, nombre: 'Anterior' };
  const fuente = jest.fn().mockResolvedValueOnce([fila]).mockResolvedValueOnce([{ id: 1, nombre: 'Actual' }]);
  const query = jest.fn().mockResolvedValueOnce({ rows: [{ generacion: '4' }] })
    .mockResolvedValue({ rows: [{ generacion: '5' }] });
  const leer = () => consultarCatalogo({ query: query as unknown as Pool['query'] }, cache,
    { catalogo: 'sedes', filtro: 'todas', ttl: 300, validarFila: () => true }, fuente);
  expect(await leer()).toEqual([fila]);
  expect(redis.set).not.toHaveBeenCalled();
  expect(await leer()).toEqual([{ id: 1, nombre: 'Actual' }]);
  expect(redis.set).toHaveBeenCalledWith('catalogo:v1:sedes:5:todas', '[{"id":1,"nombre":"Actual"}]', 'EX', 300);
});
