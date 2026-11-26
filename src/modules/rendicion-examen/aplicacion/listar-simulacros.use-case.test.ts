import { ListarSimulacrosUseCase } from './listar-simulacros.use-case';

it('solo lista nuevos intentos con vínculo vigente y conserva intentos del propietario', async () => {
  const base = { habilitadoEn: null, cierre: null, intentoId: null };
  const consultar = jest.fn().mockResolvedValue([
    { ...base, simulacroId: 'disponible', cicloId: 'vigente' },
    { ...base, simulacroId: 'otro-disponible', cicloId: 'vigente' },
    { ...base, simulacroId: 'excluido', cicloId: 'archivado' },
    { ...base, simulacroId: 'propio', cicloId: null, intentoId: 'i1' },
    { ...base, simulacroId: 'cerrado', cicloId: null, intentoId: 'i2', cierre: new Date(0) },
  ]);
  const verificar = jest.fn(async ciclo => ciclo === 'vigente');
  const caso = new ListarSimulacrosUseCase(consultar, verificar);
  const datos = await caso.ejecutar('postulante');
  expect(consultar).toHaveBeenCalledWith('postulante');
  expect(verificar.mock.calls).toEqual([['vigente', 'postulante'], ['archivado', 'postulante']]);
  expect(datos.map(x => [x.simulacroId, x.estado])).toEqual([
    ['disponible', 'DISPONIBLE'], ['otro-disponible', 'DISPONIBLE'], ['propio', 'EN_CURSO'], ['cerrado', 'FINALIZADO'],
  ]);
  expect(datos[0]).not.toHaveProperty('cicloId');
});
