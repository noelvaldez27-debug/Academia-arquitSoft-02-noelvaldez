import request from 'supertest';
import { Pool } from 'pg';
import { crearApp } from '../../../compartido/infraestructura/servidor';
import { UsuariosModule } from '../../usuarios';
import { BancoPreguntasModule, rutasOpenApiBanco } from '..';

interface CapaRouter {
  route?: { path: string; methods: Record<string, boolean> };
  handle?: { stack?: CapaRouter[] };
}

const prefijo = '/api/banco-preguntas';

function inventario(capas: CapaRouter[]): string[] {
  return capas.flatMap(({ route, handle }) => {
    if (!route) return inventario(handle?.stack ?? []);
    const ruta = route.path.replace(/:(\w+)/g, '{$1}');
    return Object.keys(route.methods).map(metodo => metodo + ' ' + prefijo + ruta);
  });
}

test('CA-BP06 el Swagger servido documenta todas las operaciones reales de Banco de Preguntas', async () => {
  const pool = { query: jest.fn() } as unknown as Pool;
  const usuarios = new UsuariosModule({ pool, jwtSecret: 'jwt-de-prueba' });
  const modulo = new BancoPreguntasModule(pool, usuarios.middlewareAutenticacion, {
    guardar: jest.fn(), obtener: jest.fn(),
  }, 20 * 1024 * 1024);
  const app = crearApp({ rutasBancoPreguntas: modulo.rutas, rutasOpenApiAdicionales: rutasOpenApiBanco });
  const operaciones = Object.entries(rutasOpenApiBanco).flatMap(([ruta, metodos]) =>
    Object.keys(metodos).map(metodo => metodo + ' ' + ruta),
  );
  expect(inventario(modulo.rutas.stack as unknown as CapaRouter[]).sort()).toEqual(operaciones.sort());
  const swagger = await request(app).get('/api-docs/swagger-ui-init.js').expect(200);
  for (const ruta of Object.keys(rutasOpenApiBanco)) expect(swagger.text).toContain(ruta);
  await request(app).get(prefijo + '/separatas/prueba').expect(401);
  expect(pool.query).not.toHaveBeenCalled();
});
