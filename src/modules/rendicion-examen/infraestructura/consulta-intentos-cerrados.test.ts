import { crearConsultaIntentosCerrados } from './postgres-examen-repository';

test('CA-AE01 consulta cierres en un lote limitado al postulante cuando se indica', async () => {
  const intento = {
    id: 'e1', postulanteId: 'p1', simulacroId: 's1', sedeId: null,
    cierre: new Date('2026-11-01T10:00:00Z'),
  };
  const query = jest.fn().mockResolvedValue({ rows: [intento] });
  const consultar = crearConsultaIntentosCerrados({ query });
  expect(await consultar([], 'p1')).toEqual([]);
  expect(await consultar(['e1'], 'p1')).toEqual([intento]);
  expect(query).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledWith(expect.stringContaining('cierre IS NOT NULL'), [['e1'], 'p1']);
});
