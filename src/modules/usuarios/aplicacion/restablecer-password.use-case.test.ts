import { RestablecerPasswordUseCase } from './restablecer-password.use-case';

describe('RestablecerPasswordUseCase', () => {
  it('solo devuelve la credencial después de persistir el hash y su vencimiento', async () => {
    const ejecutar = jest.fn().mockResolvedValue(new Date('2030-01-02T03:04:05Z'));
    const generar = jest.fn().mockReturnValue('secreto-temporal-sintetico');
    const generarHash = jest.fn().mockResolvedValue('bcrypt-hash-sintetico');
    const useCase = new RestablecerPasswordUseCase({ ejecutar }, { generar }, { generarHash, comparar: jest.fn() });
    await expect(useCase.ejecutar('21', '8', true)).resolves.toEqual({
      passwordTemporal: 'secreto-temporal-sintetico', venceEn: '2030-01-02T03:04:05.000Z',
    });
    expect(ejecutar).toHaveBeenCalledWith('21', '8', 'bcrypt-hash-sintetico');
  });

  it('requiere confirmación y no devuelve el secreto cuando el actor carece de alcance', async () => {
    const ejecutar = jest.fn().mockResolvedValue(null);
    const generar = jest.fn().mockReturnValue('secreto-temporal-sintetico');
    const useCase = new RestablecerPasswordUseCase({ ejecutar }, { generar },
      { generarHash: jest.fn().mockResolvedValue('hash-sintetico'), comparar: jest.fn() });
    await expect(useCase.ejecutar('21', '8', false)).rejects.toThrow(/Confirma/);
    expect(generar).not.toHaveBeenCalled();
    await expect(useCase.ejecutar('21', '8', true)).rejects.toThrow(/No se pudo restablecer/);
  });
});
