import { clasificar } from './clasificacion';

const participantes = [
  { postulanteId: 'c', carrera: 'MEDICINA', sedeId: '1', puntajeCentesimos: 63001, condicion: 'LIBRE' },
  { postulanteId: 'd', carrera: 'MEDICINA', sedeId: '2', puntajeCentesimos: 0, condicion: 'LIBRE' },
  { postulanteId: 'a', carrera: 'INGENIERÍA', sedeId: '1', puntajeCentesimos: 100000, condicion: 'MATRICULADO' },
  { postulanteId: 'b', carrera: 'MEDICINA', sedeId: '2', puntajeCentesimos: 63001, condicion: 'MATRICULADO' },
];

describe('CA-RR01 · clasificación por puntaje definitivo', () => {
  it('ordena de 1000 a 0 puntos y comparte puestos entre matriculados y libres', () => {
    const resultado = clasificar(participantes);
    expect(resultado.map(({ postulanteId, puesto, puntajeCentesimos }) =>
      [postulanteId, puesto, puntajeCentesimos])).toEqual([
      ['a', 1, 100000], ['b', 2, 63001], ['c', 2, 63001], ['d', 4, 0],
    ]);
    expect(clasificar([...participantes].reverse())).toEqual(resultado);
    expect(participantes.map(({ postulanteId }) => postulanteId)).toEqual(['c', 'd', 'a', 'b']);
  });

  it.each([
    [{ carrera: 'MEDICINA' }, [['b', 1], ['c', 1], ['d', 3]]],
    [{ sedeId: '1' }, [['a', 1], ['c', 2]]],
    [{ carrera: 'MEDICINA', sedeId: '2' }, [['b', 1], ['d', 2]]],
    [{ carrera: 'MEDICINA', sedeId: '3' }, []],
  ])('asigna puestos dentro del ámbito %j', (ambito, esperado) => {
    expect(clasificar(participantes, ambito).map(({ postulanteId, puesto }) =>
      [postulanteId, puesto])).toEqual(esperado);
  });
});
