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

test('CA-BP01 edita preguntas manuales y mantiene el curso y el estado si se omite el indicador', async () => {
  const guardar = jest.fn();
  const actual = { ...contenido, id: 'p', cursoId: 'c', propuestaId: null, habilitada: false };
  const repo = {
    guardar, buscar: async (id: string) => id === 'p' ? actual : null, listar: async () => [actual],
    curso: async () => null,
  } as unknown as PreguntaRepository;
  const casos = new GestionarPreguntasUseCase(repo, () => 'p');
  await expect(casos.editar(general, 'p', { ...contenido, correcta: 'C' }))
    .resolves.toMatchObject({ cursoId: 'c', correcta: 'C', habilitada: false });
  await expect(casos.editar(general, 'p', { ...contenido, habilitada: true }))
    .resolves.toMatchObject({ habilitada: true });
  await expect(casos.editar(general, 'ausente', contenido)).rejects.toThrow('no encontrada');
  await expect(casos.crear(general, 'ausente', contenido)).rejects.toThrow('Curso no encontrado');
  await expect(casos.listar(general, 'c')).resolves.toEqual([actual]);
  expect(guardar).toHaveBeenCalledTimes(2);
});

test('CA-BP01 exige un nombre de curso y conserva el identificador generado', async () => {
  const guardarCurso = jest.fn();
  const casos = new GestionarPreguntasUseCase({ guardarCurso } as unknown as PreguntaRepository, () => 'c');
  await expect(casos.guardarCurso(general, ' ')).rejects.toThrow('nombre');
  await expect(casos.guardarCurso(general, ' Matemática ')).resolves.toEqual({ id: 'c', nombre: 'Matemática' });
  expect(guardarCurso).toHaveBeenCalledTimes(1);
});
