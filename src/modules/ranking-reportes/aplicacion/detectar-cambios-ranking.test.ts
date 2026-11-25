import { detectarCambiosRanking } from './detectar-cambios-ranking';

it('CA-RR02 vuelve a detectar cambios hasta que la proyección los incorpora', () => {
  const base = { id: 's', intentos: 2, finalizados: 2, cerrado: false };
  const previa = { id: 's', intentos: 2, finalizados: 2, calificaciones: 1, definitiva: false };
  const resultados = [{ id: 's', total: 2 }];
  expect(detectarCambiosRanking([base], resultados, [])).toEqual(['s']);
  expect(detectarCambiosRanking([base], resultados, [previa])).toEqual(['s']);
  const alDia = { ...previa, calificaciones: 2 };
  expect(detectarCambiosRanking([base], resultados, [alDia])).toEqual([]);
  expect(detectarCambiosRanking([{ ...base, cerrado: true }], resultados, [alDia])).toEqual(['s']);
  expect(detectarCambiosRanking([{ ...base, intentos: 3 }], resultados, [alDia])).toEqual(['s']);
  expect(detectarCambiosRanking([{ ...base, finalizados: 1 }], resultados, [alDia])).toEqual(['s']);
});
