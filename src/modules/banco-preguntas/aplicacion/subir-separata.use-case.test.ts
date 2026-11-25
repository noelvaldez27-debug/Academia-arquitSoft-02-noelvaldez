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
