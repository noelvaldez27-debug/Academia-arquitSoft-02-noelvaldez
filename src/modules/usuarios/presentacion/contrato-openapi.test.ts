import request, { Test } from 'supertest';
import { Pool } from 'pg';
import { crearApp } from '../../../compartido/infraestructura';
import { especificacionOpenApi } from '../../../compartido/infraestructura/especificacion-openapi';
import { UsuariosModule } from '../usuarios.module';

type Metodo = 'get' | 'post' | 'patch';
interface CapaRouter {
  route?: { path: string; methods: Partial<Record<Metodo, boolean>> };
  handle?: { stack?: CapaRouter[] };
}

const prefijo = '/api/usuarios';

function inventario(capas: CapaRouter[]): string[] {
  return capas.flatMap(({ route, handle }) => {
    if (!route) return inventario(handle?.stack ?? []);
    const ruta = route.path === '/' ? '' : route.path.replace(/:(\w+)/g, '{$1}');
    return Object.keys(route.methods).map(metodo => metodo + ' ' + prefijo + ruta);
  });
}

const operaciones = Object.entries(especificacionOpenApi.paths).flatMap(([ruta, metodos]) =>
  ruta.startsWith(prefijo) ? Object.entries(metodos).map(([metodo, operacion]) => ({
    ruta, metodo: metodo as Metodo, operacion,
  })) : [],
);

describe('Contrato HTTP publicado en OpenAPI (ADR-008, CA-U07)', () => {
  const pool = { query: jest.fn() } as unknown as Pool;
  const usuarios = new UsuariosModule({ pool, jwtSecret: 'jwt-de-prueba' });
  const app = crearApp({ rutasUsuarios: usuarios.router });

  it('documenta exactamente las operaciones del módulo montadas en Express', () => {
    expect(inventario(usuarios.router.stack as unknown as CapaRouter[]).sort()).toEqual(
      operaciones.map(({ metodo, ruta }) => metodo + ' ' + ruta).sort(),
    );
  });

  it.each(operaciones)('$metodo $ruta devuelve la respuesta de autenticación documentada', async ({ metodo, ruta, operacion }) => {
    const rutaReal = ruta.replace(/\{id\}/, '12345678-1234-1234-1234-123456789012');
    const peticion: Test = request(app)[metodo](rutaReal);
    const respuesta = await peticion.expect(401);
    expect(operacion.responses).toHaveProperty('401');
    expect(respuesta.body.error).toEqual(expect.any(String));
    expect(pool.query).not.toHaveBeenCalled();
  });
});
