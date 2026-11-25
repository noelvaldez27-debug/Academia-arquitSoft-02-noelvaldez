import { validarContenidoPregunta } from './pregunta';
import { corregirPropuesta, resolverPropuesta } from './pregunta-propuesta';
import { permiteTransferencia } from './separata';

const contenido = {
  enunciado: '¿Cuál es la respuesta?',
  alternativas: { A: 'Uno', B: 'Dos', C: 'Tres', D: 'Cuatro', E: 'Cinco' },
  correcta: 'A' as const,
};

describe('Reglas de Banco de Preguntas', () => {
  test('CA-BP01 valida las cinco alternativas requeridas', () => {
    expect(validarContenidoPregunta(contenido)).toEqual(contenido);
    expect(() => validarContenidoPregunta({ ...contenido, alternativas: { ...contenido.alternativas, E: ' ' } }))
      .toThrow('cinco alternativas');
  });

  test('CA-BP05 vuelve a exigir validación tras corregir una propuesta aprobada', () => {
    const aprobada = resolverPropuesta({ ...contenido, id: 'p1', separataId: 's1', estado: 'PROPUESTA' }, 'APROBADA');
    expect(corregirPropuesta(aprobada, { ...contenido, correcta: 'B' })).toMatchObject({
      estado: 'PROPUESTA', correcta: 'B',
    });
    expect(() => resolverPropuesta(aprobada, 'APROBADA')).toThrow('ya fue resuelta');
  });

  test('CA-BP03 condiciona la transferencia al alcance vigente de la misma separata', () => {
    const permiso = {
      separataId: 's1', autorizadorId: 'admin', fecha: new Date(0),
      estado: 'AUTORIZADA' as const, alcance: ['texto' as const],
    };
    expect(permiteTransferencia('s1', permiso, 'texto')).toBe(true);
    expect(permiteTransferencia('s1', permiso, 'adjunto')).toBe(false);
    expect(permiteTransferencia('s2', permiso, 'texto')).toBe(false);
    expect(permiteTransferencia('s1', { ...permiso, estado: 'REVOCADA' }, 'texto')).toBe(false);
  });
});
