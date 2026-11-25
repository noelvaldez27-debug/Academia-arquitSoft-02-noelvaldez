import { Separata } from '../dominio/separata';
import { ExtraerTextoUseCase } from './extraer-texto.use-case';

const pdf: Separata = {
  id: 's', docenteId: 'd', cursoId: 'c', archivo: 's.pdf', mime: 'application/pdf',
  estado: 'SUBIDA', texto: null, motivo: null,
};
test('CA-BP03 prefiere el texto local y espera autorización para un escaneo', async () => {
  const extraer = jest.fn().mockResolvedValueOnce(' Tema  ').mockResolvedValue('');
  const leerAdjunto = jest.fn().mockResolvedValue('Tema sintético');
  const casos = new ExtraerTextoUseCase({ [pdf.mime]: { extraer } }, { leerAdjunto });
  const bytes = Buffer.alloc(1);
  await expect(casos.ejecutar(pdf, bytes, async () => null)).resolves.toBe('Tema');
  await expect(casos.ejecutar(pdf, bytes, async () => null)).resolves.toBeNull();
  expect(leerAdjunto).not.toHaveBeenCalled();
  await expect(casos.ejecutar(pdf, bytes, async () => ({
    separataId: 's', autorizadorId: 'a', fecha: new Date(0), estado: 'AUTORIZADA', alcance: ['adjunto'],
  }))).resolves.toBe('Tema sintético');
  expect(leerAdjunto).toHaveBeenCalledTimes(1);
});
