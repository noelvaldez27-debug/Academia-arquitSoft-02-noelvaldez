import { Examen } from '../dominio/examen';
import { ExamenRepository } from '../dominio/examen-repository';
import { IniciarExamenUseCase, consultarPropio } from './iniciar-examen.use-case';
import { TransaccionExamen } from './transaccion-examen.port';

function preparar() {
  let instante = new Date(0);
  let guardado: Examen | null = null;
  const inicializar = jest.fn();
  const examenes: ExamenRepository = {
    buscar: async id => guardado?.id === id ? guardado : null,
    buscarIntento: async () => guardado,
    insertar: async examen => guardado ??= examen,
    consolidar: jest.fn(),
    consultarFinalizado: jest.fn(),
    buscarVencidos: jest.fn(),
  };
  const simulacro = { id: 's', duracionMinutos: 1, preguntas: [] };
  const transaccion: TransaccionExamen = operar => operar({ examenes, consultarSimulacro: async () => simulacro });
  return {
    transaccion, inicializar, avanzar: (ms: number) => { instante = new Date(ms); },
    iniciar: new IniciarExamenUseCase(transaccion, () => instante, () => 'e', inicializar),
  };
}

it('CA-RE02 conserva el primer inicio y rechaza reiniciar un intento vencido', async () => {
  const { iniciar, avanzar, inicializar } = preparar();
  const primero = await iniciar.ejecutar('u', 's');
  avanzar(59_999);
  expect(await iniciar.ejecutar('u', 's')).toEqual(primero);
  expect(inicializar).toHaveBeenCalledTimes(1);
  avanzar(60_000);
  await expect(iniciar.ejecutar('u', 's')).rejects.toMatchObject({ codigo: 'vencido' });
});

it('CA-RE01 valida propiedad antes de devolver el simulacro', async () => {
  const { iniciar, transaccion } = preparar();
  await iniciar.ejecutar('u', 's');
  const proyectar = jest.fn(async examen => examen.id);
  await expect(consultarPropio(transaccion, 'e', 'u', proyectar)).resolves.toBe('e');
  await expect(consultarPropio(transaccion, 'e', 'otro', proyectar)).rejects.toMatchObject({ codigo: 'no-encontrado' });
  await expect(consultarPropio(transaccion, 'inexistente', 'u', proyectar)).rejects.toMatchObject({ codigo: 'no-encontrado' });
  expect(proyectar).toHaveBeenCalledTimes(1);
});
