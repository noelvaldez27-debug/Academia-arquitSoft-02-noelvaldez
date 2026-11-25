import { Pool } from 'pg';
import { Redis } from 'ioredis';
import request from 'supertest';
import { crearApp } from '../../compartido/infraestructura';
import { ErrorBancoPreguntas } from '../banco-preguntas';
import { MiddlewareAutenticacion, RolUsuario } from '../usuarios';
import { RendicionModule } from './rendicion.module';
import { rutasOpenApiRendicion } from './presentacion/rendicion.openapi';

function preparar() {
  const fila = { id: 'e', postulanteId: 'u', simulacroId: 's', inicio: new Date(),
    vence: new Date(Date.now() + 60_000), cierre: null as Date | null };
  let creado = false;
  let respuestas: unknown[] = [];
  const query = jest.fn(async (sql: string, valores: unknown[] = []) => {
    if (sql.startsWith('INSERT INTO examenes_rendicion')) {
      creado = true;
      return { rows: [fila] };
    }
    if (sql.startsWith('WITH cerrado')) {
      fila.cierre = valores[1] as Date;
      respuestas = JSON.parse(valores[2] as string);
      return { rows: [] };
    }
    if (sql.includes('FROM examenes_rendicion')) {
      if (sql.includes('"examenId"')) return { rows: fila.cierre ? [{ examenId: 'e', respuestas }] : [] };
      return { rows: creado && (valores[0] === 'e' || valores[0] === 'u') ? [fila] : [] };
    }
    return { rows: [] };
  });
  const release = jest.fn();
  const pool = { query, connect: async () => ({ query, release }) } as unknown as Pool;
  const marca = { numero: 1, alternativa: 'A', revision: 1 };
  const redis = {
    hgetall: jest.fn().mockResolvedValue({ activo: '1' }),
    hset: jest.fn(),
    eval: jest.fn().mockResolvedValueOnce(['ok', JSON.stringify(marca)])
      .mockImplementation(async (_lua, _n, _clave, cierre) =>
        ['activo', '1', 'cierre', String(cierre), 'marca:1', JSON.stringify(marca)]),
  };
  const autenticar: MiddlewareAutenticacion['autenticar'] = async (req, res, next) => {
    const id = req.get('x-postulante');
    if (!id) { res.sendStatus(401); return; }
    req.usuario = { id, rol: RolUsuario.Postulante } as Express.Request['usuario'];
    next();
  };
  const auth = { autenticar, requerirRol: () => (_req: unknown, _res: unknown, next: () => void) => next() };
  const modulo = new RendicionModule(pool, redis as unknown as Redis, {
    consultasVersionadas: () => ({
      consultar: async id => {
        if (id !== 's') throw new ErrorBancoPreguntas('no-encontrado', 'Simulacro no encontrado.');
        return { id, duracionMinutos: 1, preguntas: [
          { id: 'p', cursoId: 'c', enunciado: 'Pregunta', alternativas: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' } },
        ] };
      },
    }),
  }, auth as unknown as MiddlewareAutenticacion);
  const http = request(crearApp({ rutasRendicion: modulo.rutas, rutasOpenApiAdicionales: rutasOpenApiRendicion }));
  return { http, modulo, marca, query, release, redis };
}

const ruta = '/api/v1/examenes';
const iniciar = ruta + '/iniciar';

it('CA-RE01–CA-RE06 conecta rutas, casos de uso, transacciones y la consulta interna', async () => {
  const { http, modulo, marca, query, release } = preparar();
  await http.post(iniciar).expect(401);
  await http.post(iniciar).set('x-postulante', 'u').send({}).expect(400);
  await http.post(iniciar).set('x-postulante', 'u').send({ simulacroId: 'otro' }).expect(404);
  const iniciado = await http.post(iniciar).set('x-postulante', 'u').send({ simulacroId: ' s ' }).expect(200);
  expect(iniciado.body.preguntas[0]).not.toHaveProperty('correcta');
  expect(iniciado.body.tiempoRestanteMs).toBeGreaterThan(0);
  await http.get(ruta + '/e').set('x-postulante', 'otro').expect(404);
  await http.get(ruta + '/otro').set('x-postulante', 'u').expect(404);
  await http.put(ruta + '/e/respuestas').set('x-postulante', 'u').send({ ...marca, revisionBase: -1 }).expect(400);
  const guardado = await http.put(ruta + '/e/respuestas').set('x-postulante', 'u')
    .send({ numero: 1, alternativa: 'A', revisionBase: 0, operacionId: 'abc' }).expect(200);
  expect(guardado.body).toEqual(marca);
  await expect(modulo.examenesFinalizados.consultar('e')).resolves.toBeNull();
  const terminado = await http.post(ruta + '/e/finalizar').set('x-postulante', 'u').expect(200);
  expect(terminado.body.estado).toBe('FINALIZADO');
  expect((await http.get(ruta + '/e').set('x-postulante', 'u').expect(200)).body.respuestas).toEqual([marca]);
  await expect(modulo.examenesFinalizados.consultar('e')).resolves.toMatchObject({ respuestas: [marca] });
  await http.put(ruta + '/e/respuestas').set('x-postulante', 'u').send({}).expect(409);
  await http.get('/api-docs/swagger-ui-init.js').expect(200).expect(/\/api\/v1\/examenes\/\{id\}\/respuestas/);
  expect(query).toHaveBeenCalledWith('ROLLBACK');
  expect(query).toHaveBeenCalledWith('COMMIT');
  expect(release).toHaveBeenCalled();
});

it('CA-RE04 devuelve 503 sin exponer un fallo de Redis', async () => {
  const { http, redis } = preparar();
  const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    redis.hgetall.mockRejectedValueOnce(new Error('falla interna'));
    const resultado = await http.post(iniciar).set('x-postulante', 'u').send({ simulacroId: 's' }).expect(503);
    expect(resultado.body.error).not.toContain('falla interna');
  } finally {
    log.mockRestore();
  }
});
