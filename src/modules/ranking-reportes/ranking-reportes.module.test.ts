import type { Pool } from 'pg';
import request from 'supertest';
import { crearApp } from '../../compartido/infraestructura';
import { MiddlewareAutenticacion, RolUsuario } from '../usuarios';
import { RankingReportesModule, rutasOpenApiRanking } from './index';

it('CA-RR02 y CA-RR03 conectan las fuentes históricas, la transacción y la consulta publicada', async () => {
  let datos: unknown;
  const query = jest.fn(async (sql: string, opciones?: unknown[]) => {
    if (sql.startsWith('INSERT INTO proyecciones')) datos = JSON.parse(String(opciones?.[1]));
    if (sql.startsWith('SELECT datos')) return { rows: datos ? [{ datos }] : [] };
    return { rows: [] };
  });
  const release = jest.fn();
  const pool = { query, connect: async () => ({ query, release }) } as unknown as Pool;
  const autenticar: MiddlewareAutenticacion['autenticar'] = async (req, _res, next) => {
    req.usuario = { id: 'p', rol: RolUsuario.Postulante } as Express.Request['usuario'];
    next();
  };
  const caso = new RankingReportesModule(pool, {
    consultarCierre: async () => ({ administradorId: 'a', solicitadoEn: new Date(0), cerradoEn: new Date(10) }),
    porSimulacro: async (_id, cursor) => cursor ? [] : [{
      id: 'e', simulacroId: 's', postulanteId: 'p', inicio: new Date(0), cierre: new Date(9),
      carrera: null, sedeId: null, condicion: null,
    }],
    estados: async () => [],
  }, {
    porSimulacro: async (_id, cursor) => cursor ? [] : [{
      examenId: 'e', simulacroId: 's', postulanteId: 'p', puntajeCentesimos: 100000,
      correctas: 1, incorrectas: 0, omitidas: 0, porCurso: [], detalle: [],
    }],
    porPostulante: async () => [], contarCalificados: async () => 1, totalesPorSimulacro: async () => [],
  }, { autenticar } as MiddlewareAutenticacion, async () => []);
  const api = request(crearApp({ rutasRanking: caso.rutas, rutasOpenApiAdicionales: rutasOpenApiRanking }));
  await api.get('/api/v1/rankings/s/propio').expect(404);
  await caso.actualizar.ejecutar('s');
  expect(query).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), ['s']);
  expect(query).toHaveBeenCalledWith('COMMIT');
  expect(release).toHaveBeenCalledTimes(1);
  const respuesta = await api.get('/api/v1/rankings/s/propio').expect(200);
  expect(respuesta.body).toEqual({ simulacroId: 's', definitiva: true, puntaje: 1000,
    general: { puesto: 1, participantes: 1 }, sede: null, carrera: null });
  const swagger = await api.get('/api-docs/swagger-ui-init.js').expect(200);
  expect(swagger.text).toContain('/api/v1/rankings/{simulacroId}');
});
