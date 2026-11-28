import { ConsultarHistorialCredencialesUseCase } from './consultar-historial-credenciales.use-case';

test('usa paginación segura por defecto y representa explícitamente el historial vacío', async () => {
  const consultar = jest.fn().mockResolvedValue({ cambioObligatorio: false, venceEn: null, eventos: [], total: 0 });
  const useCase = new ConsultarHistorialCredencialesUseCase({ consultar });
  await expect(useCase.ejecutar('21', '8')).resolves.toEqual({
    estado: { cambioObligatorio: false, venceEn: null }, eventos: [],
    paginacion: { pagina: 1, limite: 20, total: 0 },
  });
  expect(consultar).toHaveBeenCalledWith('21', '8', 1, 20);
});

test('valida paginación e impide que un actor fuera del alcance consulte', async () => {
  const consultar = jest.fn().mockResolvedValue(null);
  const useCase = new ConsultarHistorialCredencialesUseCase({ consultar });
  await expect(useCase.ejecutar('21', '8', 1, 51)).rejects.toThrow(/máximo/);
  await expect(useCase.ejecutar('21', '8', '0')).rejects.toThrow(/entero positivo/);
  await expect(useCase.ejecutar('21', '8')).rejects.toThrow(/no se puede consultar/i);
});
