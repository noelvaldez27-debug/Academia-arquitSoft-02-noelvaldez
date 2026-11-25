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

test('CA-BP03 no envía adjuntos sin autorización vigente y registra la espera', async () => {
  const separata: Separata = {
    id:'s', docenteId:'d', cursoId:'c', archivo:'s.png', mime:'image/png', estado:'SUBIDA', texto:null, motivo:null,
  };
  const guardar = jest.fn();
  const repo = { buscar: async () => separata, guardar, autorizacion: async () => null } as unknown as SeparataRepository;
  const leerAdjunto = jest.fn();
  const proponer = jest.fn();
  const casos = new ProcesarSeparataUseCase(repo, { curso: jest.fn() },
    { obtener: async () => Buffer.alloc(1), guardar: jest.fn() }, new ExtraerTextoUseCase({}, { leerAdjunto }),
    { proponer }, () => 'p');
  await casos.ejecutar('s');
  expect(guardar).toHaveBeenLastCalledWith(expect.objectContaining({ estado:'SUBIDA', motivo:expect.stringContaining('autorización') }));
  expect(leerAdjunto).not.toHaveBeenCalled();
  expect(proponer).not.toHaveBeenCalled();
  await casos.registrarFallo('s');
  expect(guardar).toHaveBeenLastCalledWith(expect.objectContaining({ estado:'ERROR_EXTRACCION', motivo:expect.stringContaining('extraer') }));
});

test('CA-BP04 rechaza propuestas con más de una clave y conserva un motivo de fallo consultable', async () => {
  const separata: Separata = {
    id:'s', docenteId:'d', cursoId:'c', archivo:'s.pdf', mime:'application/pdf',
    estado:'TEXTO_EXTRAIDO', texto:'Tema sintético', motivo:null,
  };
  const guardar = jest.fn();
  const guardarPropuestas = jest.fn();
  const repo = { buscar: async () => separata, guardar, guardarPropuestas, autorizacion: async () => ({
    separataId:'s', autorizadorId:'admin', alcance:['texto'], fecha:new Date(0), estado:'AUTORIZADA',
  }) } as unknown as SeparataRepository;
  const ia = { proponer: async () => [{ enunciado:'Pregunta', alternativas:Array.from({ length:5 },
    (_, i) => ({ texto:String(i), esCorrecta:i < 2 })) }], leerAdjunto:jest.fn() };
  const casos = new ProcesarSeparataUseCase(repo, { curso: async () => ({ id:'c', nombre:'Curso' }) },
    { obtener:jest.fn(), guardar:jest.fn() }, new ExtraerTextoUseCase({}, ia), ia, () => 'p');
  await expect(casos.ejecutar('s')).rejects.toThrow('única respuesta');
  expect(guardarPropuestas).not.toHaveBeenCalled();
  await casos.registrarFallo('s');
  expect(guardar).toHaveBeenLastCalledWith(expect.objectContaining({ estado:'ERROR_EXTRACCION', motivo:expect.stringContaining('propuestas') }));
});
