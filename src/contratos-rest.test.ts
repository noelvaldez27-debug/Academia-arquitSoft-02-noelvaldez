import request from 'supertest';
import type { Router } from 'express';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { crearApp } from './compartido/infraestructura/servidor';
import { especificacionOpenApi } from './compartido/infraestructura/especificacion-openapi';
import { UsuariosModule } from './modules/usuarios';
import { BancoPreguntasModule, rutasOpenApiBanco } from './modules/banco-preguntas';
import { RendicionModule, rutasOpenApiRendicion } from './modules/rendicion-examen';
import { ResultadosModule, rutasOpenApiResultados } from './modules/resultados';
import { RankingReportesModule, rutasOpenApiRanking } from './modules/ranking-reportes';
import { AnaliticaModule, rutasOpenApiAnalitica } from './modules/analitica';

interface Capa {
  route?: { path: string; methods: Record<string, boolean> };
  handle?: { stack?: Capa[] };
}
type Metodo = 'get' | 'post' | 'put' | 'patch' | 'delete';

function inventario(rutas: Capa[], prefijo: string): string[] {
  return rutas.flatMap(({ route, handle }) => {
    if (!route) return inventario(handle?.stack ?? [], prefijo);
    const ruta = route.path === '/' ? '' : route.path.replace(/:(\w+)/g, '{$1}');
    return Object.keys(route.methods).map(metodo => metodo + ' ' + prefijo + ruta);
  });
}

test('CA-VS05 contrasta las seis familias REST con el Swagger servido y sus estados sin sesión', async () => {
  const query = jest.fn();
  const pool = { query } as unknown as Pool;
  const usuarios = new UsuariosModule({ pool, jwtSecret: 'jwt-sintetico' });
  const auth = usuarios.middlewareAutenticacion;
  const banco = new BancoPreguntasModule(pool, auth, { guardar: jest.fn(), obtener: jest.fn() }, 10000);
  const rendicion = new RendicionModule(pool, {} as Redis, banco, auth);
  const resultados = new ResultadosModule(pool, rendicion.examenesFinalizados, auth);
  const ranking = new RankingReportesModule(pool, rendicion.consultasReportes, resultados.consultas, auth, async () => []);
  const analitica = new AnaliticaModule(pool, auth,
    { ...resultados.consultas, paraAnalitica: resultados.resultadosParaAnalitica }, async () => []);
  const rutasOpenApiAdicionales = { ...rutasOpenApiBanco, ...rutasOpenApiRendicion, ...rutasOpenApiResultados,
    ...rutasOpenApiRanking, ...rutasOpenApiAnalitica };
  const app = crearApp({ rutasUsuarios: usuarios.router, rutasBancoPreguntas: banco.rutas,
    rutasRendicion: rendicion.rutas, rutasResultados: resultados.rutas, rutasRanking: ranking.rutas,
    rutasAnalitica: analitica.rutas, rutasOpenApiAdicionales });
  const familias: [string, Router][] = [
    ['/api/usuarios', usuarios.router], ['/api/banco-preguntas', banco.rutas],
    ['/api/v1/examenes', rendicion.rutas], ['/api/v1/resultados', resultados.rutas],
    ['/api/v1/rankings', ranking.rutas], ['/api/v1/analitica', analitica.rutas],
  ];
  const contrato = Object.entries({ ...especificacionOpenApi.paths, ...rutasOpenApiAdicionales })
    .filter(([ruta]) => ruta.startsWith('/api/'))
    .flatMap(([ruta, operaciones]) => Object.entries(operaciones).map(([metodo, operacion]) =>
      ({ ruta, metodo, operacion })));
  const implementadas = familias.flatMap(([prefijo, router]) => inventario(router.stack as Capa[], prefijo));
  expect(implementadas.sort()).toEqual(contrato.map(({ ruta, metodo }) => metodo + ' ' + ruta).sort());
  const swagger = await request(app).get('/api-docs/swagger-ui-init.js').expect(200);
  for (const { ruta, metodo, operacion } of contrato) {
    expect(swagger.text).toContain(ruta);
    expect(operacion.responses).toHaveProperty('401');
    const rutaReal = ruta.replace(/\{\w+\}/g, '12345678-1234-1234-1234-123456789012');
    await request(app)[metodo as Metodo](rutaReal).expect(401);
  }
  expect(query).not.toHaveBeenCalled();
});
