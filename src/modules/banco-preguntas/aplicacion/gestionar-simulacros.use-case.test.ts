import { Pregunta } from '../dominio/pregunta';
import { PreguntaRepository } from '../dominio/pregunta-repository';
import { GestionarSimulacrosUseCase } from './gestionar-simulacros.use-case';

const general = { id: 'a', permiso: 'general' as const };
const pregunta: Pregunta = {
  id: 'p1', cursoId: 'c', propuestaId: null, habilitada: true, enunciado: 'Pregunta',
  alternativas: { A: '1', B: '2', C: '3', D: '4', E: '5' }, correcta: 'A',
};
const configuracion = { id: 's', duracionMinutos: 25, preguntas: ['p2', 'p1'] };

test('CA-BP06 conserva el orden y entrega las claves por un contrato separado', async () => {
  const guardarSimulacro = jest.fn();
  const banco = {
    buscar: async (id: string) => ({ ...pregunta, id }),
    buscarSimulacro: async () => configuracion,
    guardarSimulacro,
  } as unknown as PreguntaRepository;
  const casos = new GestionarSimulacrosUseCase(banco, () => 's');
  await casos.guardar(general, configuracion);
  expect(guardarSimulacro).toHaveBeenCalledWith(configuracion);
  const paraRendicion = await casos.consultar('s');
  expect(paraRendicion.preguntas.map(p => p.id)).toEqual(['p2', 'p1']);
  expect(paraRendicion.preguntas[0]).not.toHaveProperty('correcta');
  expect(await casos.clave('s')).toEqual([{ preguntaId: 'p2', correcta: 'A' }, { preguntaId: 'p1', correcta: 'A' }]);
});

test('CA-BP06 rechaza preguntas inhabilitadas y evita guardar la configuración', async () => {
  const guardarSimulacro = jest.fn();
  const banco = { buscar: async () => ({ ...pregunta, habilitada: false }), guardarSimulacro } as unknown as PreguntaRepository;
  const casos = new GestionarSimulacrosUseCase(banco, () => 's');
  await expect(casos.guardar(general, configuracion)).rejects.toThrow('habilitadas');
  expect(guardarSimulacro).not.toHaveBeenCalled();
});
