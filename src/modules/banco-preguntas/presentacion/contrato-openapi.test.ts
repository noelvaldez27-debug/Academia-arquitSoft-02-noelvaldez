import request from 'supertest';
import { Pool } from 'pg';
import { crearApp } from '../../../compartido/infraestructura/servidor';
import { AlcanceAdministrador, RolUsuario, UsuariosModule } from '../../usuarios';
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

test('la API distingue administrador general, de sede y docente en las operaciones protegidas', async () => {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('FROM cursos_banco')) return { rows: [{ id: 'curso', nombre: 'Matemática' }] };
    return { rows: [] };
  });
  const pool = { query, connect: async () => ({ query, release: jest.fn() }) } as unknown as Pool;
  const usuarios = new UsuariosModule({ pool, jwtSecret: 'jwt-de-prueba' });
  jest.spyOn(usuarios.middlewareAutenticacion, 'autenticar').mockImplementation(async (req, _res, next) => {
    const tipo = req.header('x-actor');
    req.usuario = {
      id: '1', nombre: 'Actor sintético', correo: 'prueba@ejemplo.invalid', activo: true,
      rol: tipo === 'docente' ? RolUsuario.Docente : RolUsuario.Administrador,
      alcanceAdministrador: tipo === 'general' ? AlcanceAdministrador.General : AlcanceAdministrador.Sede,
      sedeId: null, carrera: null,
    };
    next();
  });
  const guardar = jest.fn().mockResolvedValue('separata');
  const modulo = new BancoPreguntasModule(pool, usuarios.middlewareAutenticacion, { guardar, obtener: jest.fn() }, 20);
  const app = crearApp({ rutasBancoPreguntas: modulo.rutas });
  const curso = prefijo + '/cursos';
  const subida = curso + '/curso/separatas';
  await request(app).post(curso).set('x-actor', 'sede').send({ nombre: 'Matemática' }).expect(403);
  await request(app).post(curso).set('x-actor', 'general').send({ nombre: ' ' }).expect(400);
  await request(app).post(curso).set('x-actor', 'general').send({ nombre: 'Matemática' }).expect(201);
  await request(app).post(subida).set('x-actor', 'general').expect(403);
  await request(app).post(subida).set('x-actor', 'docente').expect(400);
  await request(app).post(subida).set('x-actor', 'docente').attach('archivo', Buffer.alloc(21), 'a.pdf').expect(400);
  await request(app).post(subida).set('x-actor', 'docente').attach('archivo', Buffer.from('%PDF-1.7'), 'a.pdf').expect(202);
  await request(app).get(prefijo + '/separatas/desconocida').set('x-actor', 'general').expect(404);
  expect(guardar).toHaveBeenCalledTimes(1);
});
