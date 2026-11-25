import { ServicioIASimulado } from '../../../compartido/infraestructura/servicio-ia-simulado';
import { AutorizacionExterna, Separata } from '../dominio/separata';
import { SeparataRepository } from '../dominio/separata-repository';
import { ExtraerTextoUseCase } from './extraer-texto.use-case';
import { ProcesarSeparataUseCase } from './procesar-separata.use-case';

test('CA-BP04 espera autorización, persiste propuestas y omite una entrega repetida', async () => {
  let separata: Separata = {
    id: 's', docenteId: 'd', cursoId: 'c', archivo: 's.pdf', mime: 'application/pdf',
    estado: 'SUBIDA', texto: null, motivo: null,
  };
  let autorizacion: AutorizacionExterna | null = null;
  const guardarPropuestas = jest.fn(async () => {
    separata = { ...separata, estado: 'PREGUNTAS_PROPUESTAS' };
  });
  const repo = {
    buscar: async () => ({ ...separata }),
    guardar: async (nueva: Separata) => { separata = nueva; },
    autorizacion: async () => autorizacion,
    guardarPropuestas,
  } as unknown as SeparataRepository;
  const ia = new ServicioIASimulado();
  const proponer = jest.spyOn(ia, 'proponer');
  const extraer = new ExtraerTextoUseCase({ [separata.mime]: { extraer: async () => 'Tema sintético' } }, ia);
  const casos = new ProcesarSeparataUseCase(repo, { curso: async () => ({ id: 'c', nombre: 'Probabilidad' }) },
    { obtener: async () => Buffer.alloc(1), guardar: async () => '' }, extraer, ia, () => 'p');

  await casos.ejecutar('s');
  expect(separata.estado).toBe('TEXTO_EXTRAIDO');
  expect(proponer).not.toHaveBeenCalled();
  autorizacion = { separataId: 's', autorizadorId: 'a', alcance: ['texto'], fecha: new Date(0), estado: 'AUTORIZADA' };
  await casos.ejecutar('s');
  await casos.ejecutar('s');
  expect(proponer).toHaveBeenCalledTimes(1);
  expect(guardarPropuestas).toHaveBeenCalledWith(expect.objectContaining({ id: 's' }),
    [expect.objectContaining({ id: 'p', estado: 'PROPUESTA', correcta: 'A' })]);
});
