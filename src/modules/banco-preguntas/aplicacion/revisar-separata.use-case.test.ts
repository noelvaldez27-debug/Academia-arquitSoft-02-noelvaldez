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

test('CA-BP05 permite corregir al administrador y descartar al docente responsable', async () => {
  let actual = { ...propuesta, estado: 'APROBADA' };
  const repo = { revisarPropuesta: async (_id: string, revisar: (p: typeof actual, d: string) => typeof actual) => {
    actual = revisar(actual, 'd');
    return actual;
  } } as unknown as SeparataRepository;
  const casos = new RevisarSeparataUseCase(repo, () => new Date(0));
  await expect(casos.corregir(general, 'p', { ...propuesta, correcta: 'B' })).resolves.toMatchObject({
    correcta: 'B', estado: 'PROPUESTA',
  });
  await expect(casos.descartar({ id: 'otro', permiso: 'docente' }, 'p')).rejects.toThrow('docente responsable');
  await expect(casos.descartar({ id: 'd', permiso: 'docente' }, 'p')).resolves.toMatchObject({ estado: 'RECHAZADA' });
});

test('CA-BP03 al revocar se registra el nuevo estado sin conservar alcance vigente', async () => {
  const guardarAutorizacion = jest.fn();
  const casos = new RevisarSeparataUseCase({
    buscar: async (id: string) => id === 's' ? { id } : null, guardarAutorizacion,
  } as unknown as SeparataRepository, () => new Date(0));
  await expect(casos.autorizar(general, 's', { estado: 'REVOCADA', alcance: ['adjunto'] }))
    .resolves.toMatchObject({ estado: 'REVOCADA', alcance: [] });
  await expect(casos.autorizar(general, 'ausente', { estado: 'REVOCADA' })).rejects.toThrow('no encontrada');
  await expect(casos.autorizar(general, 's', { estado: 'AUTORIZADA', alcance: [], contenidoApto: true }))
    .rejects.toThrow('alcance');
  expect(guardarAutorizacion).toHaveBeenCalledTimes(1);
});

test('CA-BP05 protege el original y devuelve el estado sin divulgar la ruta de almacenamiento', async () => {
  const buscar = jest.fn(async (id: string) => id === 's' ? {
    docenteId: 'd', archivo: 'separatas/interno.pdf', mime: 'application/pdf', cursoId: 'c',
    estado: 'ERROR_EXTRACCION', motivo: 'Sin texto',
  } : null);
  const obtener = jest.fn().mockResolvedValue(Buffer.from('contenido sintético'));
  const casos = new RevisarSeparataUseCase({
    buscar, autorizacion: async () => null, listarPropuestas: async () => [],
  } as unknown as SeparataRepository, () => new Date(0), { obtener });
  const ajeno = { id: 'otro', permiso: 'docente' as const };
  await expect(casos.obtenerOriginal(ajeno, 's')).rejects.toThrow('docente responsable');
  await expect(casos.consultar(ajeno, 's')).rejects.toThrow('docente responsable');
  expect(obtener).not.toHaveBeenCalled();
  await expect(casos.obtenerOriginal(general, 's')).resolves.toMatchObject({ mime: 'application/pdf' });
  await expect(casos.consultar({ id: 'd', permiso: 'docente' }, 's')).resolves.toEqual({
    id: 's', cursoId: 'c', estado: 'ERROR_EXTRACCION', motivo: 'Sin texto', autorizacion: null, propuestas: [],
  });
  await expect(casos.obtenerOriginal(general, 'ausente')).rejects.toThrow('no encontrada');
  await expect(casos.consultar(general, 'ausente')).rejects.toThrow('no encontrada');
});
