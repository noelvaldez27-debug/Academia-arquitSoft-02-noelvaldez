import { ActualizarRankingUseCase, PersistenciaRanking } from './actualizar-ranking.use-case';
import { IntentoRanking, ProyeccionRanking } from '../dominio/proyeccion-ranking';

it('CA-RR01–CA-RR02 pagina fuentes y conserva resultados históricos sin filtrar por datos actuales', async () => {
  const base = { inicio: 'inicio', cierre: 'cierre', condicion: null };
  const historico: IntentoRanking = { id: 'e1', postulanteId: 'p1', carrera: null, sedeId: null, ...base };
  const actual: IntentoRanking = { id: 'e2', postulanteId: 'p2', carrera: 'MEDICINA', sedeId: '1', ...base };
  let proyeccion: ProyeccionRanking | null = null;
  let disponible = false;
  const repositorio: PersistenciaRanking = {
    reemplazar: async (_id, construir) => { proyeccion = await construir(); },
    consultar: async () => proyeccion,
  };
  const caso = new ActualizarRankingUseCase({
    cerrado: async () => true,
    intentos: async (_id, cursor) => cursor === undefined ? [historico] : cursor === 'e1' ? [actual] : [],
    calificaciones: async (_id, cursor) => {
      if (cursor || !disponible) return [];
      return [historico, actual].map(intento => ({
        examenId: intento.id, puntajeCentesimos: 100000, correctas: 1, incorrectas: 0, omitidas: 0, porCurso: [],
      }));
    },
  }, repositorio);
  await caso.ejecutar('s');
  expect(await repositorio.consultar('s')).toMatchObject({ definitiva: false, calificaciones: [] });
  disponible = true;
  await caso.ejecutar('s');
  const reporte = await repositorio.consultar('s');
  expect(reporte?.definitiva).toBe(true);
  expect(reporte?.ambitos.map(ambito => ambito.filas.map(({ postulanteId, puesto }) =>
    [postulanteId, puesto]))).toEqual([[['p1', 1], ['p2', 1]], [['p2', 1]], [['p2', 1]], [['p2', 1]]]);
  await caso.ejecutar('s');
  expect(await repositorio.consultar('s')).toEqual(reporte);
});
