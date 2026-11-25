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
