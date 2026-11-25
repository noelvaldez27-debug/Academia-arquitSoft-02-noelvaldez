import { calificar, ClavePregunta, ExamenParaCalificar } from './resultado';

const examen = (respuestas: ExamenParaCalificar['respuestas'] = []): ExamenParaCalificar => ({
  examenId: 'e', postulanteId: 'u', simulacroId: 's', respuestas,
});
const claves = (n: number): ClavePregunta[] => Array.from({ length: n }, (_, i) => ({
  preguntaId: 'p' + i, cursoId: i % 2 ? 'c2' : 'c1', correcta: 'A',
}));

it.each([1, 3, 37])('CA-PR02 asigna exactamente 1000 puntos a %i aciertos de %i', total => {
  const marcas = claves(total).map((_, i) => ({ numero: i + 1, alternativa: 'A' as const }));
  expect(calificar(examen(marcas), claves(total)).puntajeCentesimos).toBe(100_000);
});

it('CA-PR02 da cero puntos por errores y por omisiones', () => {
  expect(calificar(examen([{ numero: 1, alternativa: 'B' }]), claves(1)))
    .toMatchObject({ puntajeCentesimos: 0, incorrectas: 1 });
  expect(calificar(examen(), claves(2))).toMatchObject({ puntajeCentesimos: 0, omitidas: 2 });
});

it('CA-PR02 redondea al final, incluyendo un empate exacto', () => {
  const uno = examen([{ numero: 1, alternativa: 'A' }]);
  expect(calificar(uno, claves(3)).puntajeCentesimos).toBe(33_333);
  expect(calificar(uno, claves(64)).puntajeCentesimos).toBe(1_563);
});

it('CA-PR02 agrupa aciertos, errores y omisiones, incluida una marca borrada', () => {
  const resultado = calificar(examen([
    { numero: 1, alternativa: 'A' }, { numero: 2, alternativa: 'B' }, { numero: 3, alternativa: null },
  ]), claves(4));
  expect(resultado).toMatchObject({ puntajeCentesimos: 25_000, correctas: 1, incorrectas: 1, omitidas: 2,
    porCurso: [
      { cursoId: 'c1', correctas: 1, incorrectas: 0, omitidas: 1 },
      { cursoId: 'c2', correctas: 0, incorrectas: 1, omitidas: 1 },
    ] });
});

it('CA-PR01 rechaza una versión vacía o duplicada y marcas ajenas o duplicadas', () => {
  expect(() => calificar(examen(), [])).toThrow();
  expect(() => calificar(examen(), [...claves(1), ...claves(1)])).toThrow();
  expect(() => calificar(examen([{ numero: 2, alternativa: 'A' }]), claves(1))).toThrow();
  const marca = { numero: 1, alternativa: 'A' as const };
  expect(() => calificar(examen([marca, marca]), claves(1))).toThrow();
});
