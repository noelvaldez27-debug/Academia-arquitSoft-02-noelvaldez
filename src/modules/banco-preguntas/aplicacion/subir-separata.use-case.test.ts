import { AlmacenArchivos } from '../../../compartido/aplicacion/almacen-archivos';

import { SeparataRepository } from '../dominio/separata-repository';
import { SubirSeparataUseCase } from './subir-separata.use-case';

test('CA-BP02 valida, almacena el original y registra el evento sin datos del nombre original', async () => {
  const guardarArchivo = jest.fn();
  const guardar = jest.fn();
  const casos = new SubirSeparataUseCase({ curso: async () => ({ id: 'c', nombre: 'Curso' }) },
    { guardar } as unknown as SeparataRepository, { guardar: guardarArchivo } as unknown as AlmacenArchivos, () => 's', 50);
  const docente = { id: 'd', permiso: 'docente' as const };
  const pdf = Buffer.from('%PDF-1.7');
  await expect(casos.ejecutar(docente, 'c', 'original.pdf', pdf)).resolves.toEqual({ id: 's', estado: 'SUBIDA' });
  expect(guardarArchivo).toHaveBeenCalledWith('separatas/s.pdf', pdf);
  expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ docenteId: 'd', archivo: 'separatas/s.pdf' }), true);
  await expect(casos.ejecutar(docente, 'c', 'falso.pdf', Buffer.from('otro formato'))).rejects.toThrow('válido');
  await expect(casos.ejecutar(docente, 'c', 'grande.pdf', Buffer.alloc(51))).rejects.toThrow('tamaño máximo');
  expect(guardar).toHaveBeenCalledTimes(1);
});

test.each([
  ['separata.JPG', 'ffd8ff', 'image/jpeg'],
  ['separata.jpeg', 'ffd8ff', 'image/jpeg'],
  ['separata.png', '89504e470d0a1a0a', 'image/png'],
  ['separata.docx', '504b03045b436f6e74656e745f54797065735d2e786d6c776f72642f646f63756d656e742e786d6c', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
])('CA-BP02 identifica %s sin confiar en el MIME del cliente', async (nombre, firma, mime) => {
  const guardar = jest.fn();
  const casos = new SubirSeparataUseCase({ curso: async () => ({ id: 'c', nombre: 'Curso' }) },
    { guardar } as unknown as SeparataRepository, { guardar: jest.fn() } as unknown as AlmacenArchivos, () => 's', 50);
  await casos.ejecutar({ id: 'd', permiso: 'docente' }, 'c', nombre, Buffer.from(firma, 'hex'));
  expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ mime }), true);
});

test('CA-BP02 rechaza .doc, ZIP sin partes DOCX y cursos inexistentes antes de guardar', async () => {
  const guardar = jest.fn();
  const casos = new SubirSeparataUseCase({ curso: async () => null },
    { guardar } as unknown as SeparataRepository, { guardar } as unknown as AlmacenArchivos, () => 's', 50);
  const docente = { id: 'd', permiso: 'docente' as const };
  await expect(casos.ejecutar(docente, 'c', 'antiguo.doc', Buffer.from('archivo'))).rejects.toThrow('válido');
  await expect(casos.ejecutar(docente, 'c', 'falso.docx', Buffer.from('504b0304', 'hex'))).rejects.toThrow('válido');
  await expect(casos.ejecutar(docente, 'c', 'archivo.pdf', Buffer.from('%PDF-1.7'))).rejects.toThrow('Curso');
  expect(guardar).not.toHaveBeenCalled();
});
