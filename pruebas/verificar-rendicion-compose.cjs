const assert = require('node:assert/strict');
const { randomInt } = require('node:crypto');
const { setTimeout: esperar } = require('node:timers/promises');
const { crearPoolPostgres, crearConexionRabbitMQ } = require('/app/dist/compartido/infraestructura');

const base = 'http://127.0.0.1:3000';
const usuarios = '/api/usuarios';
const banco = '/api/banco-preguntas';
const rendicion = '/api/v1/examenes';

async function solicitar(metodo, ruta, token, datos) {
  const headers = {};
  if (token) headers.authorization = 'Bearer ' + token;
  if (datos) headers['content-type'] = 'application/json';
  return fetch(base + ruta, { method: metodo, headers, body: datos && JSON.stringify(datos) });
}

async function http(metodo, ruta, estado, token, datos) {
  const respuesta = await solicitar(metodo, ruta, token, datos);
  assert.equal(respuesta.status, estado, metodo + ' ' + ruta);
  return respuesta.json();
}

async function hasta(consultar, descripcion) {
  for (let vuelta = 0; vuelta < 40; vuelta++) {
    const resultado = await consultar();
    if (resultado) return resultado;
    await esperar(250);
  }
  assert.fail(descripcion);
}

async function verificar() {
  const bd = crearPoolPostgres();
  let rabbit;
  try {
    const login = async (correo, password) => (await http('POST', usuarios + '/login', 200, null, { correo, password })).token;
    const admin = await login(process.env.ADMIN_GENERAL_CORREO, process.env.ADMIN_GENERAL_PASSWORD);
    const [sede] = await http('GET', usuarios + '/sedes', 200, admin);
    async function crearPostulante() {
      const dni = String(randomInt(10_000_000, 99_999_999));
      const usuario = await http('POST', usuarios + '/estudiantes', 201, admin, {
        dni, nombre: 'Postulante de prueba', carrera: 'Ingeniería', condicion: 'LIBRE', sedeId: sede.id,
      });
      return { id: usuario.id, token: await login(dni + '@sofia.edu', dni) };
    }
    const [uno, dos, tres] = await Promise.all([crearPostulante(), crearPostulante(), crearPostulante()]);
    const curso = await http('POST', banco + '/cursos', 201, admin, { nombre: 'Curso Rendición ' + randomInt(1_000_000) });
    const contenido = { enunciado: 'Pregunta original', correcta: 'A',
      alternativas: { A: 'Uno', B: 'Dos', C: 'Tres', D: 'Cuatro', E: 'Cinco' } };
    const p1 = await http('POST', banco + '/cursos/' + curso.id + '/preguntas', 201, admin, contenido);
    const p2 = await http('POST', banco + '/cursos/' + curso.id + '/preguntas', 201, admin, {
      ...contenido, enunciado: 'Segunda pregunta', correcta: 'B',
    });
    const simulacro = await http('POST', banco + '/simulacros', 201, admin, {
      duracionMinutos: 15, preguntas: [p2.id, p1.id],
    });
    const inicio = { simulacroId: simulacro.id };
    const iniciar = token => http('POST', rendicion + '/iniciar', 200, token, inicio);
    await http('POST', rendicion + '/iniciar', 401, null, inicio);
    await http('POST', rendicion + '/iniciar', 403, admin, inicio);
    await http('POST', rendicion + '/iniciar', 404, uno.token, { simulacroId: 'no-existe' });
    const [a, aRepetido, b] = await Promise.all([iniciar(uno.token), iniciar(uno.token), iniciar(dos.token)]);
    assert.equal(a.id, aRepetido.id);
    assert.equal(a.inicio, aRepetido.inicio);
    assert.deepEqual(a.preguntas, b.preguntas);
    assert.deepEqual(a.preguntas.map(p => p.id), [p2.id, p1.id]);
    assert.ok(a.preguntas.every(p => !Object.hasOwn(p, 'correcta')));

    await http('PUT', banco + '/preguntas/' + p1.id, 200, admin, { ...contenido, enunciado: 'Editada', correcta: 'E' });
    await http('PUT', banco + '/simulacros/' + simulacro.id, 200, admin, { duracionMinutos: 2, preguntas: [p1.id] });
    const c = await iniciar(tres.token);
    assert.deepEqual(c.preguntas, a.preguntas);
    assert.equal(new Date(c.vence) - new Date(c.inicio), 15 * 60_000);
    const version = await bd.query('SELECT preguntas FROM versiones_simulacro WHERE id = $1', [simulacro.id]);
    assert.deepEqual(version.rows[0].preguntas.map(p => p.correcta), ['B', 'A']);

    const ruta = rendicion + '/' + a.id;
    const marca = { numero: 1, alternativa: 'B', revisionBase: 0, operacionId: 'primera' };
    await http('GET', ruta, 404, dos.token);
    await http('PUT', ruta + '/respuestas', 404, dos.token, marca);
    await http('POST', ruta + '/finalizar', 404, dos.token);
    await http('PUT', ruta + '/respuestas', 400, uno.token, { ...marca, numero: 3 });
    const guardar = (comando, estado = 200) => http('PUT', ruta + '/respuestas', estado, uno.token, comando);
    assert.equal((await guardar(marca)).revision, 1);
    assert.equal((await guardar(marca)).revision, 1);
    assert.equal((await guardar({ ...marca, alternativa: 'C' }, 409)).codigo, 'conflicto');
    const ediciones = await Promise.all(['C', 'D'].map(alternativa => solicitar('PUT', ruta + '/respuestas', uno.token,
      { ...marca, alternativa, revisionBase: 1, operacionId: 'edicion-' + alternativa })));
    assert.deepEqual(ediciones.map(r => r.status).sort(), [200, 409]);
    assert.equal((await guardar(marca)).revision, 1);
    await guardar({ ...marca, operacionId: 'atrasada' }, 409);
    assert.equal((await guardar({ ...marca, alternativa: null, revisionBase: 2, operacionId: 'borrado' })).revision, 3);
    const recuperado = await http('GET', ruta, 200, uno.token);
    assert.deepEqual(recuperado.respuestas, [{ numero: 1, alternativa: null, revision: 3 }]);
    assert.ok(recuperado.tiempoRestanteMs > 0 && recuperado.tiempoRestanteMs <= a.tiempoRestanteMs);

    const finales = await Promise.all([1, 2].map(() => http('POST', ruta + '/finalizar', 200, uno.token)));
    assert.deepEqual(finales[0], finales[1]);
    assert.deepEqual((await http('GET', ruta, 200, uno.token)).respuestas, recuperado.respuestas);
    await guardar({ ...marca, revisionBase: 3, operacionId: 'cerrado' }, 409);
    await http('POST', rendicion + '/iniciar', 409, uno.token, inicio);

    const rutaB = rendicion + '/' + b.id;
    await http('PUT', rutaB + '/respuestas', 200, dos.token, marca);
    await bd.query(`UPDATE examenes_rendicion
      SET inicio = clock_timestamp() - interval '1 minute', vence = clock_timestamp() - interval '1 second' WHERE id = $1`, [b.id]);
    await http('PUT', rutaB + '/respuestas', 409, dos.token, { ...marca, revisionBase: 1, operacionId: 'tardia' });
    const expirado = await hasta(async () => {
      const examen = await http('GET', rutaB, 200, dos.token);
      return examen.estado === 'FINALIZADO' && examen;
    }, 'El vencimiento debía consolidarse sin petición de cierre.');
    assert.equal(expirado.tiempoRestanteMs, 0);
    assert.deepEqual(expirado.respuestas, [{ numero: 1, alternativa: 'B', revision: 1 }]);

    if (process.env.RENDICION_BROKER_CAIDO === '1') {
      const pendientes = await bd.query(
        'SELECT examen_id FROM envios_examen_finalizado WHERE examen_id = ANY($1) AND NOT publicado', [[a.id, b.id]],
      );
      assert.deepEqual(pendientes.rows.map(fila => fila.examen_id).sort(), [a.id, b.id].sort());
      console.log('CA-RE05 verificado con RabbitMQ detenido: ambos cierres quedaron pendientes de publicación.');
      return;
    }

    rabbit = await crearConexionRabbitMQ();
    const canal = await rabbit.createChannel();
    await canal.assertQueue('examen.finalizado', { durable: true });
    const esperados = new Set([a.id, b.id]);
    await hasta(async () => {
      const mensaje = await canal.get('examen.finalizado');
      if (!mensaje) return false;
      const evento = JSON.parse(mensaje.content);
      assert.equal(evento.tipo, 'ExamenFinalizado');
      assert.equal(mensaje.properties.messageId, evento.examenId);
      esperados.delete(evento.examenId);
      canal.ack(mensaje);
      return esperados.size === 0;
    }, 'Faltan eventos de exámenes finalizados en RabbitMQ.');
    const swagger = await fetch(base + '/api-docs/swagger-ui-init.js');
    assert.match(await swagger.text(), /\/api\/v1\/examenes\/\{id\}\/finalizar/);
    await http('PATCH', usuarios + '/' + tres.id + '/desactivar', 200, admin);
    await http('GET', rendicion + '/' + c.id, 401, tres.token);
    console.log('CA-RE01–CA-RE06 verificados con PostgreSQL, Redis, RabbitMQ y la API.');
  } finally {
    if (rabbit) await rabbit.close();
    await bd.end();
  }
}

verificar().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
