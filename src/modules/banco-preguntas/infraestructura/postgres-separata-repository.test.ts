import { Pool } from 'pg';
import { PostgresSeparataRepository } from './postgres-separata-repository';

function preparar() {
  const bd = { query: jest.fn(), release: jest.fn() };
  const repo = new PostgresSeparataRepository({ connect: async () => bd } as unknown as Pool);
  bd.query.mockResolvedValue({ rows: [] }).mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{
    id: 'p', separataId: 's', estado: 'PROPUESTA', docenteId: 'd', cursoId: 'c',
    contenido: { enunciado: 'Pregunta', alternativas: { A: 'uno', B: 'dos', C: 'tres', D: 'cuatro', E: 'cinco' }, correcta: 'A' },
  }] });
  return { bd, repo };
}

test('CA-BP05 confirma la aprobación y la incorporación en la misma transacción', async () => {
  const { bd, repo } = preparar();
  await repo.revisarPropuesta('p', p => ({ ...p, estado: 'APROBADA' }));
  expect(bd.query.mock.calls.map(([sql]) => sql)).toEqual([
    'BEGIN', expect.stringContaining('FOR UPDATE OF p'), expect.stringContaining('UPDATE propuestas_banco'),
    expect.stringContaining('INSERT INTO preguntas_banco'), 'COMMIT',
  ]);
  expect(bd.release).toHaveBeenCalledTimes(1);
});

test('CA-BP05 revierte la aprobación si falla la incorporación al banco', async () => {
  const { bd, repo } = preparar();
  bd.query.mockImplementation(sql => {
    if (sql.includes('INSERT INTO preguntas_banco')) throw new Error('Fallo de persistencia');
    return { rows: [] };
  });
  await expect(repo.revisarPropuesta('p', p => ({ ...p, estado: 'APROBADA' }))).rejects.toThrow('Fallo de persistencia');
  expect(bd.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(bd.release).toHaveBeenCalledTimes(1);
});

test('CA-BP05 corregir una propuesta retira del banco la versión validada en la misma transacción', async () => {
  const { bd, repo } = preparar();
  await repo.revisarPropuesta('p', p => ({ ...p, correcta: 'B', estado: 'PROPUESTA' }));
  expect(bd.query).toHaveBeenCalledWith(expect.stringContaining('SET habilitada = false'), ['p']);
  expect(bd.query).toHaveBeenLastCalledWith('COMMIT');
});

test('CA-BP04 solo persiste propuestas cuando la separata aún espera generación', async () => {
  const propuesta = { id:'p', separataId:'s', estado:'PROPUESTA' as const, correcta:'A' as const,
    enunciado:'Pregunta', alternativas:{ A:'1', B:'2', C:'3', D:'4', E:'5' } };
  const separata = { id:'s', docenteId:'d', cursoId:'c', archivo:'s.pdf', mime:'application/pdf',
    estado:'TEXTO_EXTRAIDO' as const, texto:'Tema', motivo:null };
  const bd = { query: jest.fn().mockResolvedValue({}).mockResolvedValueOnce({}).mockResolvedValueOnce({ rowCount:1 })
    .mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce({ rowCount:0 }),
    release:jest.fn() };
  const repo = new PostgresSeparataRepository({ connect: async () => bd } as unknown as Pool);
  await repo.guardarPropuestas(separata, [propuesta]);
  await repo.guardarPropuestas(separata, [propuesta]);
  expect(bd.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO propuestas_banco'))).toHaveLength(1);
  expect(bd.release).toHaveBeenCalledTimes(2);
});

test('CA-BP03 registra la autorización y programa el procesamiento; revocar no lo programa', async () => {
  const bd = { query:jest.fn(), release:jest.fn() };
  const repo = new PostgresSeparataRepository({ connect: async () => bd } as unknown as Pool);
  const permiso = { separataId:'s', autorizadorId:'admin', fecha:new Date(0), alcance:['texto' as const] };
  await repo.guardarAutorizacion({ ...permiso, estado:'AUTORIZADA' });
  await repo.guardarAutorizacion({ ...permiso, alcance:[], estado:'REVOCADA' });
  expect(bd.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO envios_separata'))).toHaveLength(1);
  expect(bd.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO autorizaciones_separata'),
    ['s','admin',permiso.fecha,'REVOCADA',[]]);
});

test('CA-BP02 guarda la separata y su envío como una unidad', async () => {
  const bd = { query:jest.fn(), release:jest.fn() };
  const repo = new PostgresSeparataRepository({ connect: async () => bd } as unknown as Pool);
  const separata = { id:'s', docenteId:'d', cursoId:'c', archivo:'s.pdf', mime:'application/pdf',
    estado:'SUBIDA' as const, texto:null, motivo:null };
  await repo.guardar(separata, true);
  expect(bd.query.mock.calls.map(([sql]) => sql)).toEqual([
    'BEGIN', expect.stringContaining('INSERT INTO separatas'), expect.stringContaining('INSERT INTO envios_separata'), 'COMMIT',
  ]);
});
