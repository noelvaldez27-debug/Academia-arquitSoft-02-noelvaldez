import { Examen } from '../dominio/examen';
import { ExamenRepository } from '../dominio/examen-repository';
import { FinalizarExamenUseCase } from './finalizar-examen.use-case';
import { RespuestasTemporales } from './respuestas-temporales.port';
import { TransaccionExamen } from './transaccion-examen.port';

function preparar() {
  const vence = new Date(60_000);
  let ahora = new Date(10_000);
  let examen = new Examen('e', 'u', 's', new Date(0), vence);
  const respuestas = [{ numero: 1, alternativa: null, revision: 2 }];
  const sellar = jest.fn(async (_id: string, cierre: Date) => ({ cierre, respuestas }));
  const consolidar = jest.fn(async (cerrado: Examen) => { examen = cerrado; });
  const repositorio: ExamenRepository = {
    buscar: async id => id === 'e' ? examen : null,
    consolidar, buscarIntento: jest.fn(), insertar: jest.fn(),
    consultarFinalizado: jest.fn(), buscarVencidos: jest.fn(),
  };
  const temporales: RespuestasTemporales = {
    sellar, limpiar: jest.fn(), inicializar: jest.fn(), listar: jest.fn(), registrar: jest.fn(),
  };
  const transaccion: TransaccionExamen = operar =>
    operar({ examenes: repositorio, consultarSimulacro: jest.fn() });
  return { sellar, consolidar, vence, respuestas, vencer: () => { ahora = vence; },
    finalizar: new FinalizarExamenUseCase(transaccion, temporales, () => ahora) };
}

it('CA-RE04 consolida una sola vez al vencer y permite repetir el cierre', async () => {
  const { finalizar, vencer, vence, respuestas, sellar, consolidar } = preparar();
  expect(await finalizar.expirar('e')).toBeNull();
  vencer();
  const cierre = await finalizar.expirar('e');
  expect(cierre).toEqual({ id: 'e', estado: 'FINALIZADO', cierre: vence });
  expect(await finalizar.ejecutar('e', 'u')).toEqual(cierre);
  expect(sellar).toHaveBeenCalledTimes(1);
  expect(consolidar).toHaveBeenCalledWith(expect.objectContaining({ cierre: vence }), respuestas);
  expect(consolidar).toHaveBeenCalledTimes(1);
});

it('CA-RE04 no confirma cierres ajenos, inexistentes o sin copia temporal disponible', async () => {
  const { finalizar, sellar, consolidar } = preparar();
  await expect(finalizar.ejecutar('e', 'otro')).rejects.toMatchObject({ codigo: 'no-encontrado' });
  await expect(finalizar.ejecutar('otro', 'u')).rejects.toMatchObject({ codigo: 'no-encontrado' });
  sellar.mockRejectedValueOnce(new Error('Redis caído'));
  await expect(finalizar.ejecutar('e', 'u')).rejects.toThrow('Redis caído');
  expect(consolidar).not.toHaveBeenCalled();
});
