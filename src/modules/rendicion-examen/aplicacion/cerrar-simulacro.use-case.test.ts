import { CompletarCierreSimulacro } from './cerrar-simulacro.use-case';
import { IntentoParaReportes } from '../dominio/examen';

it('CA-RR02 espera que todos los intentos finalicen y aparezcan en Resultados', async () => {
  const intento: IntentoParaReportes = {
    id: 'e', simulacroId: 's', postulanteId: 'p', inicio: new Date(0), cierre: null,
    carrera: null, sedeId: null, condicion: null,
  };
  const listar = jest.fn(async (_id: string, despues?: string) => despues ? [] : [intento]);
  const contar = jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(1);
  const cerrar = jest.fn();
  const caso = new CompletarCierreSimulacro(listar, contar, cerrar);
  await expect(caso.ejecutar('s')).resolves.toBe(false);
  expect(contar).not.toHaveBeenCalled();
  intento.cierre = new Date(10);
  await expect(caso.ejecutar('s')).resolves.toBe(false);
  expect(cerrar).not.toHaveBeenCalled();
  await expect(caso.ejecutar('s')).resolves.toBe(true);
  expect(listar).toHaveBeenLastCalledWith('s', 'e');
  expect(cerrar).toHaveBeenCalledWith('s');
});
