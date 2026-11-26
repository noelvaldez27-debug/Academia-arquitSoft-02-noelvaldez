const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const Excel = require('exceljs');
const { Redis } = require('ioredis');
const { crearPoolPostgres, crearClienteRedis } = require('/app/dist/compartido/infraestructura');
const { RedisCacheConsultas } = require('/app/dist/compartido/infraestructura/redis-cache-consultas');
const { consultarVersionVisible } = require('/app/dist/modules/banco-preguntas/infraestructura/cache-version-visible');
const { PostgresVersionSimulacro } = require('/app/dist/modules/banco-preguntas/infraestructura/postgres-version-simulacro');
const { setTimeout: esperar } = require('node:timers/promises');

async function http(metodo, ruta, estado, token, datos) {
  const headers = token ? { authorization: 'Bearer ' + token } : {};
  if (datos) headers['content-type'] = 'application/json';
  const res = await fetch('http://127.0.0.1:3000/api' + ruta, {
    method: metodo, headers, body: datos && JSON.stringify(datos),
  });
  assert.equal(res.status, estado, metodo + ' ' + ruta);
  return res;
}

async function main() {
  const bd = crearPoolPostgres();
  const redis = new Redis({ host: process.env.REDIS_CACHE_HOST, password: process.env.REDIS_CACHE_PASSWORD });
  const respuestas = crearClienteRedis();
  try {
    const u = '/usuarios';
    const b = '/banco-preguntas';
    const e = '/v1/examenes';
    const login = async (correo, password) =>
      (await (await http('POST', u + '/login', 200, null, { correo, password })).json()).token;
    const admin = await login(process.env.ADMIN_GENERAL_CORREO, process.env.ADMIN_GENERAL_PASSWORD);
    const [sede] = await (await http('GET', u + '/sedes', 200, admin)).json();
    const ciclo = await (await http('POST', u + '/ciclos', 201, admin, {
      nombre: randomUUID(), iniciaEl: '2020-01-01', terminaEl: '2090-12-31',
    })).json();
    async function postulante() {
      const dni = String(randomInt(10_000_000, 99_999_999));
      const correo = dni + '@sofia.edu';
      const perfil = await (await http('POST', u + '/estudiantes', 201, admin, {
        dni, nombre: 'Postulante sintético', carrera: 'Ingeniería', sedeId: sede.id, cicloId: ciclo.id,
      })).json();
      const archivo = await http('POST', u + '/estudiantes/' + perfil.id + '/credenciales', 200, admin);
      const libro = new Excel.Workbook();
      await libro.xlsx.load(Buffer.from(await archivo.arrayBuffer()));
      const passwordActual = libro.getWorksheet(1).getCell('B2').value;
      const passwordNueva = randomUUID();
      await http('PATCH', u + '/password', 200, await login(correo, passwordActual), { passwordActual, passwordNueva });
      return login(correo, passwordNueva);
    }
    const [uno, dos] = await Promise.all([postulante(), postulante()]);
    const curso = await (await http('POST', b + '/cursos', 201, admin, { nombre: randomUUID() })).json();
    const tema = await (await http('POST', b + '/cursos/' + curso.id + '/preguntas', 201, admin, {
      enunciado: 'Pregunta sintética', correcta: 'A', alternativas: { A: '1', B: '2', C: '3', D: '4', E: '5' },
    })).json();
    const sim = await (await http('POST', b + '/simulacros', 201, admin, {
      duracionMinutos: 15, preguntas: [tema.id],
    })).json();
    await http('POST', e + '/simulacros/' + sim.id + '/habilitar', 200, admin, { cicloId: ciclo.id });
    const iniciar = async token => (await (await http('POST', e + '/iniciar', 200, token, { simulacroId: sim.id })).json());
    const [intento, repetido] = await Promise.all([iniciar(uno), iniciar(uno)]);
    assert.equal(intento.id, repetido.id);
    assert.ok(!Object.hasOwn(intento.preguntas[0], 'correcta'));
    const ruta = e + '/' + intento.id;
    const marca = { numero: 1, alternativa: 'A', revisionBase: 0, operacionId: 'marca' };
    await http('PUT', ruta + '/respuestas', 200, uno, marca);
    await http('GET', ruta, 404, dos);
    const clave = 'banco:version-visible:v1:' + sim.id;
    const marcaRedis = 'rendicion:examen:' + intento.id;
    assert.ok(await redis.ttl(clave) > 3500);
    assert.equal(await respuestas.ttl(marcaRedis), -1);
    await redis.client('PAUSE', 750, 'ALL');
    const recuperado = await (await http('GET', ruta, 200, uno)).json();
    assert.deepEqual(recuperado.respuestas, [{ numero: 1, alternativa: 'A', revision: 1 }]);
    assert.equal(await respuestas.exists(marcaRedis), 1);
    await esperar(750);
    let sql = 0;
    const medido = new PostgresVersionSimulacro({ query: (...args) => { sql++; return bd.query(...args); } });
    const fuente = () => medido.congelar(sim.id);
    const cache = new RedisCacheConsultas(redis);
    const consultar = async habilitada => {
      const confirmadas = [];
      const salida = await consultarVersionVisible(sim.id, fuente, habilitada ? cache : undefined,
        accion => confirmadas.push(accion));
      for (const accion of confirmadas) await accion();
      return salida;
    };
    const medir = async habilitada => {
      sql = 0;
      const inicio = performance.now();
      for (let i = 0; i < 20; i++) assert.deepEqual((await consultar(habilitada)).preguntas, intento.preguntas);
      return { sql, ms: Math.round((performance.now() - inicio) * 100) / 100 };
    };
    const sinCache = await medir(false);
    await redis.del(clave);
    const cacheFria = await medir(true);
    const cacheCaliente = await medir(true);
    assert.deepEqual([sinCache.sql, cacheFria.sql, cacheCaliente.sql], [20, 1, 0]);
    await redis.pexpire(clave, 1);
    await esperar(15);
    assert.equal(await redis.exists(clave), 0);
    assert.equal(await respuestas.exists(marcaRedis), 1);
    await http('POST', ruta + '/finalizar', 200, uno);
    const final = await (await http('GET', ruta, 200, uno)).json();
    assert.deepEqual(final.respuestas, recuperado.respuestas);
    console.log(JSON.stringify({ lecturasPorVariante: 20, sinCache, cacheFria, cacheCaliente, aislamiento: true }));
  } finally {
    redis.disconnect();
    respuestas.disconnect();
    await bd.end();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
