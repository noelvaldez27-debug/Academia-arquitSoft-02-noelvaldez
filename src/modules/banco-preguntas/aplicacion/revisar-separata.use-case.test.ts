import { SeparataRepository } from '../dominio/separata-repository';
import { RevisarSeparataUseCase } from './revisar-separata.use-case';

const propuesta = {
  id: 'p', separataId: 's', estado: 'PROPUESTA',
  enunciado: 'Tema', alternativas: { A: '1', B: '2', C: '3', D: '4', E: '5' }, correcta: 'A',
};
const general = { id: 'a', permiso: 'general' as const };

test('CA-BP05 solo el docente titular puede aprobar', async () => {
  const repo = {
    revisarPropuesta: async (_id: string, revisar: (p: unknown, docente: string) => unknown) => revisar(propuesta, 'd'),
  } as unknown as SeparataRepository;
  const casos = new RevisarSeparataUseCase(repo, () => new Date(0));
  await expect(casos.aprobar(general, 'p')).rejects.toThrow('docente responsable');
  await expect(casos.aprobar({ id: 'otro', permiso: 'docente' }, 'p')).rejects.toThrow('docente responsable');
  await expect(casos.aprobar({ id: 'd', permiso: 'docente' }, 'p')).resolves.toMatchObject({ estado: 'APROBADA' });
});

test('CA-BP03 registra autorización explícita y alcance por separata', async () => {
  const guardarAutorizacion = jest.fn();
  const repo = { buscar: async () => ({ id: 's' }), guardarAutorizacion } as unknown as SeparataRepository;
  const casos = new RevisarSeparataUseCase(repo, () => new Date(0));
  await expect(casos.autorizar(general, 's', { estado: 'AUTORIZADA', alcance: ['texto'] })).rejects.toThrow('permisos');
  await casos.autorizar(general, 's', { estado: 'AUTORIZADA', alcance: ['texto'], contenidoApto: true });
  expect(guardarAutorizacion).toHaveBeenCalledTimes(1);
  expect(guardarAutorizacion).toHaveBeenCalledWith({
    separataId: 's', autorizadorId: 'a', fecha: new Date(0), estado: 'AUTORIZADA', alcance: ['texto'],
  });
});
