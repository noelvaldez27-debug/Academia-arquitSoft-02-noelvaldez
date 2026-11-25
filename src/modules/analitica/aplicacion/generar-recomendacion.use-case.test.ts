import { ConsultarHistorialUseCase } from './consultar-historial.use-case';
import { GenerarRecomendacionUseCase } from './generar-recomendacion.use-case';
import { prioridades, Recomendacion } from '../dominio/recomendacion';

test('CA-AE03 aplica mínimo, umbral exacto, desempates y máximo de tres', () => {
  const curso = (cursoId: string, correctas: number, total: number) =>
    ({ cursoId, correctas, incorrectas: total - correctas, omitidas: 0 });
  const { seleccionados } = prioridades([
    curso('sin-datos', 0, 4), curso('umbral', 3, 5), curso('b', 1, 5), curso('a', 1, 5),
    curso('mas-datos', 2, 10), curso('ultimo', 2, 5),
  ]);
  expect(seleccionados.map(fila => fila.cursoId)).toEqual(['mas-datos', 'a', 'b']);
});

test('CA-AE03 comparte solicitudes concurrentes, renueva y aplica alternativa ante proveedor inválido', async () => {
  let cantidad = 1;
  const historial = new ConsultarHistorialUseCase(async (postulanteId, cursor) => cursor ? [] :
    Array.from({ length: cantidad }, (_, i) => ({
      postulanteId, examenId: String(i), simulacroId: 's' + i, puntajeCentesimos: 0,
      correctas: 0, incorrectas: 5, omitidas: 0,
      porCurso: [{ cursoId: 'c1', correctas: 0, incorrectas: 5, omitidas: 0 }],
    })), async (ids, postulanteId) => ids.map(id => ({
      id, postulanteId, simulacroId: 's' + id, cierre: new Date(0), sedeId: null,
    })));
  const repositorio = new Map<string, Promise<Recomendacion>>();
  const proveedor = jest.fn().mockResolvedValueOnce('Repasa con ejercicios.').mockResolvedValueOnce(' ');
  const fallo = jest.fn();
  const casos = new GenerarRecomendacionUseCase(historial, {
    obtenerOCrear: async (_, clave, reglas, generar) => {
      const id = reglas + ':' + clave;
      if (!repositorio.has(id)) repositorio.set(id, generar().then(valor => ({ ...valor, generadaEn: 'fecha' })));
      return repositorio.get(id)!;
    },
  }, ids => ids.join(','), async () => [{ id: 'c1', nombre: 'Álgebra' }],
  async () => [{ cursoId: 'c1', tema: { id: 't1', nombre: 'Ecuaciones' } }], proveedor, fallo);
  const [a, b] = await Promise.all([casos.ejecutar('p1'), casos.ejecutar('p1')]);
  expect(a).toEqual(b);
  expect(a).toMatchObject({ origen: 'ia' });
  expect(proveedor).toHaveBeenCalledTimes(1);
  expect(proveedor).toHaveBeenCalledWith([{ nombre: 'Álgebra', desempeno: 0, temas: ['Ecuaciones'] }]);
  cantidad++;
  expect(await casos.ejecutar('p1')).toMatchObject({ origen: 'local' });
  expect(fallo).toHaveBeenCalledTimes(1);
});
