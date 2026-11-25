import type { Pool } from 'pg';
import request from 'supertest';
import { crearApp } from '../../compartido/infraestructura/servidor';
import { ServicioIASimulado } from '../../compartido/infraestructura/servicio-ia-simulado';
import { AlcanceAdministrador, MiddlewareAutenticacion, RolUsuario } from '../usuarios';
import { AnaliticaModule, rutasOpenApiAnalitica } from './index';

test('CA-AE03 y CA-AE04 integra rutas, resultados, persistencia y ServicioIA simulado', async () => {
  const resultado = {
    examenId: 'e1', postulanteId: 'p1', simulacroId: 's1', puntajeCentesimos: 0,
    correctas: 0, incorrectas: 3, omitidas: 2, detalle: [],
    porCurso: [{ cursoId: 'c1', correctas: 0, incorrectas: 3, omitidas: 2 }],
  };
  const fecha = new Date('2026-11-25T12:00:00Z');
  let guardada: { cursos: string[]; contenido: string; origen: string; generadaEn: Date } | undefined;
  const cliente = {
    query: jest.fn(async (sql: string, valores: string[]) => {
      if (sql.includes('FROM recomendaciones_analitica')) return { rows: guardada ? [guardada] : [] };
      if (sql.includes('INSERT INTO recomendaciones_analitica')) {
        guardada = { cursos: JSON.parse(valores[3]), contenido: valores[4], origen: valores[5], generadaEn: fecha };
        return { rows: [guardada] };
      }
      return { rows: [] };
    }),
    release: jest.fn(),
  };
  const pool = {
    connect: jest.fn(async () => cliente),
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM cursos_banco')) return { rows: [{ id: 'c1', nombre: 'Física' }] };
      if (sql.includes('FROM examenes_rendicion')) return {
        rows: [{ id: 'e1', postulanteId: 'p1', simulacroId: 's1', cierre: fecha, sedeId: 'hana' }],
      };
      return { rows: [] };
    }),
  } as unknown as Pool;
  const auth = {
    autenticar: async (req, _res, next) => {
      const rol = req.headers.authorization === 'postulante' ? RolUsuario.Postulante : RolUsuario.Administrador;
      req.usuario = { id: 'p1', rol, sedeId: 'hana',
        alcanceAdministrador: req.headers.authorization === 'general' ? AlcanceAdministrador.General : AlcanceAdministrador.Sede,
      } as typeof req.usuario;
      next();
    },
    requerirRol: rol => (req, res, next) => {
      if (req.usuario?.rol === rol) next();
      else res.sendStatus(403);
    },
  } satisfies Pick<MiddlewareAutenticacion, 'autenticar' | 'requerirRol'>;
  const ia = new ServicioIASimulado({ respuestaRecomendar: 'Resuelve ejercicios de práctica.' });
  const recomendar = jest.spyOn(ia, 'recomendar');
  const analitica = new AnaliticaModule(pool, auth as MiddlewareAutenticacion, {
    porPostulante: async (_, cursor) => cursor ? [] : [resultado],
    paraAnalitica: async () => [],
    porSimulacro: async () => [], contarCalificados: async () => 0, totalesPorSimulacro: async () => [],
  }, async () => [], ia);
  const app = crearApp({ rutasAnalitica: analitica.rutas, rutasOpenApiAdicionales: rutasOpenApiAnalitica });
  const ruta = '/api/v1/analitica';
  const pedir = () => request(app).post(ruta + '/mi-recomendacion').set('Authorization', 'postulante');
  const primera = await pedir().expect(200);
  const segunda = await pedir().expect(200);
  expect(primera.body).toMatchObject({ estado: 'vigente', origen: 'ia', cursos: ['c1'] });
  expect(segunda.body).toEqual(primera.body);
  expect(recomendar).toHaveBeenCalledTimes(1);
  expect(cliente.release).toHaveBeenCalledTimes(2);
  await request(app).get(ruta + '/estadisticas?sedeId=urin').set('Authorization', 'sede').expect(403);
  await request(app).get(ruta + '/estadisticas').set('Authorization', 'general').expect(200);
});
