import { consultarVersionVisible } from './cache-version-visible';
import { RedisCacheConsultas } from '../../../compartido/infraestructura/redis-cache-consultas';

it('CA-CC01 llena solo tras confirmar y reutiliza la proyección visible', async () => {
  const dto = { id: 'simulacro', duracionMinutos: 15, preguntas: [{
    id: 'p1', cursoId: 'c1', enunciado: 'Pregunta', alternativas: { A: '1', B: '2', C: '3', D: '4', E: '5' },
  }] };
  const fuente = jest.fn(async () => dto);
  const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
  const cache = new RedisCacheConsultas(redis);
  const confirmar: Array<() => Promise<void>> = [];
  const consultar = () => consultarVersionVisible(dto.id, fuente, cache, accion => confirmar.push(accion));
  expect(await consultar()).toEqual(dto);
  expect(redis.set).not.toHaveBeenCalled();
  await confirmar[0]();
  expect(redis.set).toHaveBeenCalledWith('banco:version-visible:v1:simulacro', JSON.stringify(dto), 'EX', 3600);
  redis.get.mockResolvedValue(JSON.stringify({ ...dto, preguntas: [{ ...dto.preguntas[0], correcta: 'A' }] }));
  expect(await consultar()).toEqual(dto);
  expect(fuente).toHaveBeenCalledTimes(1);
});
