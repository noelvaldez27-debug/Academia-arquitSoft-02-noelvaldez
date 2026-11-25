import { PostgresPreguntaRepository } from './postgres-pregunta-repository';

test('la consulta de preguntas y simulacros conserva el contenido y el orden almacenados', async () => {
  const contenido = { enunciado: '¿Cuánto es 2+2?', correcta: 'A', alternativas: { A:'4', B:'5', C:'6', D:'7', E:'8' } };
  const fila = { id: 'p', cursoId: 'c', contenido, habilitada: true, propuestaId: null };
  const configuracion = { id: 's', duracionMinutos: 30, preguntas: ['p2', 'p'] };
  const query = jest.fn().mockResolvedValueOnce({ rows: [fila] }).mockResolvedValueOnce({ rows: [fila] })
    .mockResolvedValueOnce({ rows: [configuracion] }).mockResolvedValueOnce({ rows: [] });
  const repo = new PostgresPreguntaRepository({ query });
  await expect(repo.buscar('p')).resolves.toEqual({ id:'p', cursoId:'c', habilitada:true, propuestaId:null, ...contenido });
  await expect(repo.listar('c')).resolves.toHaveLength(1);
  await expect(repo.buscarSimulacro('s')).resolves.toEqual(configuracion);
  await expect(repo.buscar('no-existe')).resolves.toBeNull();
});

test('persiste el curso, la pregunta y el orden de selección con parámetros', async () => {
  const query = jest.fn().mockResolvedValue({ rows: [{ id:'c', nombre:'Matemática' }] });
  const repo = new PostgresPreguntaRepository({ query });
  await expect(repo.curso('c')).resolves.toEqual({ id:'c', nombre:'Matemática' });
  await repo.guardarCurso({ id:'c', nombre:'Matemática' });
  await repo.guardar({ id:'p', cursoId:'c', enunciado:'Pregunta', correcta:'A', habilitada:true, propuestaId:null,
    alternativas:{ A:'uno', B:'dos', C:'tres', D:'cuatro', E:'cinco' } });
  await repo.guardarSimulacro({ id:'s', duracionMinutos:30, preguntas:['p2','p'] });
  expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO cursos_banco'), ['c','Matemática']);
  expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO preguntas_banco'),
    ['p','c',expect.stringContaining('"correcta":"A"'),true,null]);
  expect(query).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO configuraciones_simulacro'), ['s',30,'["p2","p"]']);
});
