import { Examen, validarMarca } from './examen';

const inicio = new Date('2026-01-01T00:00:00Z');
const vence = new Date('2026-01-01T00:01:00Z');
const examen = new Examen('examen', 'postulante', 'simulacro', inicio, vence);

describe('Examen', () => {
  it('CA-RE01 aísla el examen por postulante', () => {
    expect(() => examen.verificarPropietario('postulante')).not.toThrow();
    expect(() => examen.verificarPropietario('otro')).toThrow('Examen no encontrado.');
  });

  it('CA-RE03 considera vencido el instante exacto del límite', () => {
    const antes = new Date(vence.getTime() - 1);
    expect(examen.tiempoRestante(antes)).toBe(1);
    expect(() => examen.verificarVigencia(antes)).not.toThrow();
    expect(examen.tiempoRestante(vence)).toBe(0);
    expect(() => examen.verificarVigencia(vence)).toThrow('El plazo venció.');
  });

  it('CA-RE04 conserva el cierre autorizado en reintentos', () => {
    const tarde = new Date(vence.getTime() + 1000);
    const cerrado = examen.finalizar(tarde);
    expect(cerrado.estado).toBe('FINALIZADO');
    expect(cerrado.cierre).toEqual(vence);
    expect(cerrado.finalizar(tarde)).toBe(cerrado);
    expect(cerrado.tiempoRestante(inicio)).toBe(0);
    expect(() => cerrado.verificarVigencia(inicio)).toThrow('El examen ya finalizó.');
    expect(examen.estado).toBe('ACTIVO');
    expect(examen.finalizar(inicio).cierre).toEqual(inicio);
  });

  it('CA-RE03 permite borrar y valida alternativas contra el orden congelado', () => {
    const simulacro = {
      id: 'simulacro',
      duracionMinutos: 1,
      preguntas: [{ id: 'p', cursoId: 'c', enunciado: 'Pregunta', alternativas: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' } }],
    };
    expect(() => validarMarca(simulacro, 1, 'A')).not.toThrow();
    expect(() => validarMarca(simulacro, 1, null)).not.toThrow();
    expect(() => validarMarca(simulacro, 1, 'constructor')).toThrow();
    expect(() => validarMarca(simulacro, 0, 'A')).toThrow();
    expect(() => validarMarca(simulacro, 1.5, 'A')).toThrow();
  });
});
