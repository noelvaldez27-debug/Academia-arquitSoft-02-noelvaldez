import { PreguntaRepository } from '../dominio/pregunta-repository';
import { ActorBanco } from './actor-banco';
import { GestionarPreguntasUseCase } from './gestionar-preguntas.use-case';

const general: ActorBanco = { id: 'a', permiso: 'general' };
const contenido = {
  enunciado: ' Pregunta ', correcta: 'B' as const,
  alternativas: { A: 'uno', B: 'dos', C: 'tres', D: 'cuatro', E: 'cinco' },
};

test('CA-BP01 restringe el alta directa al administrador general', async () => {
  const guardar = jest.fn();
  const casos = new GestionarPreguntasUseCase({ guardar } as unknown as PreguntaRepository, () => 'p');
  await expect(casos.crear({ id: 'd', permiso: 'docente' }, 'c', contenido)).rejects.toThrow('administrador general');
  expect(guardar).not.toHaveBeenCalled();
});

test('CA-BP01 registra una pregunta validada en el curso', async () => {
  const guardar = jest.fn();
  const repositorio = { curso: async () => ({ id: 'c', nombre: 'Matemática' }), guardar };
  const casos = new GestionarPreguntasUseCase(repositorio as unknown as PreguntaRepository, () => 'p');
  await expect(casos.crear(general, 'c', contenido)).resolves.toMatchObject({
    id: 'p', cursoId: 'c', enunciado: 'Pregunta', correcta: 'B', habilitada: true,
  });
  expect(guardar).toHaveBeenCalledTimes(1);
});

test('CA-BP05 protege la revisión docente de una edición directa', async () => {
  const guardar = jest.fn();
  const casos = new GestionarPreguntasUseCase({
    guardar, buscar: async () => ({ ...contenido, propuestaId: 'propuesta' }),
  } as unknown as PreguntaRepository, () => 'p');
  await expect(casos.editar(general, 'p', contenido)).rejects.toThrow('validación docente');
  expect(guardar).not.toHaveBeenCalled();
});
