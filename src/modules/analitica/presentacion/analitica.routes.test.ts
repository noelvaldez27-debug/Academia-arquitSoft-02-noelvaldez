import express from 'express';
import request from 'supertest';
import type { MiddlewareAutenticacion } from '../../usuarios';
import type { ConsultarHistorialUseCase } from '../aplicacion/consultar-historial.use-case';
import type { GenerarRecomendacionUseCase } from '../aplicacion/generar-recomendacion.use-case';
import type { ConsultarEstadisticasUseCase } from '../aplicacion/consultar-estadisticas.use-case';
import { crearRutasAnalitica } from './analitica.routes';

test('CA-AE04 las consultas personales solo usan el postulante autenticado', async () => {
  const auth = {
    autenticar: async (req, res, next) => {
      if (!req.headers.authorization) { res.sendStatus(401); return; }
      req.usuario = { id: 'p1', rol: req.headers.authorization.toUpperCase() } as typeof req.usuario;
      next();
    },
    requerirRol: rol => (req, res, next) => {
      if (req.usuario?.rol !== rol) { res.sendStatus(403); return; }
      next();
    },
  } satisfies Pick<MiddlewareAutenticacion, 'autenticar' | 'requerirRol'>;
  const historial = { ejecutar: jest.fn().mockResolvedValue({ historial: [], porCurso: [], resultados: ['interno'] }) };
  const recomendacion = { ejecutar: jest.fn().mockResolvedValue({ estado: 'evidencia_insuficiente' }) };
  const estadisticas = { ejecutar: jest.fn().mockResolvedValue({ porCurso: [], porTema: [], porPregunta: [] }) };
  const app = express().use(crearRutasAnalitica(auth as MiddlewareAutenticacion,
    historial as unknown as ConsultarHistorialUseCase, recomendacion as unknown as GenerarRecomendacionUseCase,
    estadisticas as unknown as ConsultarEstadisticasUseCase));
  await request(app).get('/mi-historial').expect(401);
  await request(app).post('/mi-recomendacion').set('Authorization', 'docente').expect(403);
  await request(app).get('/mi-historial?postulanteId=p2').set('Authorization', 'postulante')
    .expect(200, { historial: [], porCurso: [] });
  await request(app).post('/mi-recomendacion?postulanteId=p2').set('Authorization', 'postulante').expect(200);
  expect(historial.ejecutar).toHaveBeenCalledWith('p1');
  expect(recomendacion.ejecutar).toHaveBeenCalledWith('p1');
  await request(app).get('/estadisticas').set('Authorization', 'postulante').expect(403);
  await request(app).get('/estadisticas?cursoId=c1&cursoId=c2').set('Authorization', 'docente').expect(400);
  await request(app).get('/estadisticas?temaId=sin-clasificar').set('Authorization', 'docente').expect(200);
  expect(estadisticas.ejecutar).toHaveBeenCalledTimes(1);
});
