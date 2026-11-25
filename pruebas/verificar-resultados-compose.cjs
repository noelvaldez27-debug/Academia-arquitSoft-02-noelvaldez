const assert = require('node:assert/strict');
const { randomInt } = require('node:crypto');
const { readFile, writeFile } = require('node:fs/promises');
const { setTimeout: esperar } = require('node:timers/promises');
const { crearPoolPostgres, crearConexionRabbitMQ } = require('/app/dist/compartido/infraestructura');

const banco = '/api/banco-preguntas';
const usuarios = '/api/usuarios';
const archivos = '/tmp/evalua-resultados-recuperacion.json';
const cola = 'examen.finalizado';

async function enviar(metodo, ruta, token, datos) {
  const headers = {};
  if (token) headers.authorization = 'Bearer ' + token;
  if (datos) headers['content-type'] = 'application/json';
  return fetch('http://127.0.0.1:3000' + ruta, { method: metodo, headers, body: datos && JSON.stringify(datos) });
}

async function http(metodo, ruta, estado, token, datos) {
  const respuesta = await enviar(metodo, ruta, token, datos);
  assert.equal(respuesta.status, estado, metodo + ' ' + ruta);
  return respuesta.json();
}

async function preparar() {
  const login = async (correo, password) =>
    (await http('POST', usuarios + '/login', 200, null, { correo, password })).token;
  const admin = await login(process.env.ADMIN_GENERAL_CORREO, process.env.ADMIN_GENERAL_PASSWORD);
  const [sede] = await http('GET', usuarios + '/sedes', 200, admin);
  async function postulante() {
    const dni = String(randomInt(10_000_000, 100_000_000));
    await http('POST', usuarios + '/estudiantes', 201, admin, { dni, nombre: 'Postulante', carrera: 'Ingeniería', sedeId: sede.id });
    return login(dni + '@sofia.edu', dni);
  }
  const [token, ajeno] = await Promise.all([postulante(), postulante()]);
  const [c1, c2] = await Promise.all(['Matemática', 'Física'].map(nombre => http('POST', banco + '/cursos', 201, admin,
    { nombre: nombre + ' ' + randomInt(1_000_000) })));
  const contenido = { enunciado: 'Pregunta de prueba', correcta: 'A', alternativas: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' } };
  const preguntas = await Promise.all([c1, c2, c1].map(c => http('POST', banco + '/cursos/' + c.id + '/preguntas', 201, admin, contenido)));
  const simulacro = await http('POST', banco + '/simulacros', 201, admin,
    { duracionMinutos: 5, preguntas: preguntas.map(p => p.id) });
  const examen = await http('POST', '/api/v1/examenes/iniciar', 200, token, { simulacroId: simulacro.id });
  const ruta = '/api/v1/examenes/' + examen.id;
  await http('PUT', banco + '/preguntas/' + preguntas[0].id, 200, admin, { ...contenido, correcta: 'D' });
  await http('PUT', banco + '/simulacros/' + simulacro.id, 200, admin,
    { duracionMinutos: 2, preguntas: [preguntas[2].id] });
  await Promise.all(['A', 'B', 'C'].map((alternativa, i) => http('PUT', ruta + '/respuestas', 200, token,
    { numero: i + 1, alternativa, revisionBase: 0, operacionId: 'marca-' + i })));
  await http('PUT', ruta + '/respuestas', 200, token, { numero: 3, alternativa: null, revisionBase: 1, operacionId: 'borrar' });
  const url = '/api/v1/resultados/' + examen.id;
  await http('GET', url, 404, token);
  await http('GET', url, 401);
  await http('GET', url, 403, admin);
  const inicio = performance.now();
  await http('POST', ruta + '/finalizar', 200, token);
  return { token, ajeno, url, id: examen.id, simulacroId: simulacro.id, c1: c1.id, c2: c2.id, inicio };
}

async function esperarResultado({ url, token }) {
  for (let i = 0; i < 100; i++) {
    const respuesta = await enviar('GET', url, token);
    if (respuesta.status === 200) return respuesta.json();
    assert.equal(respuesta.status, 202);
    await esperar(100);
  }
  assert.fail('El resultado no se publicó.');
}

function verificarNota(resultado, datos) {
  assert.deepEqual(resultado, {
    estado: 'PROCESADO', examenId: datos.id, simulacroId: datos.simulacroId,
    puntaje: 333.33, correctas: 1, incorrectas: 1, omitidas: 1,
    porCurso: [
      { cursoId: datos.c1, correctas: 1, incorrectas: 0, omitidas: 1 },
      { cursoId: datos.c2, correctas: 0, incorrectas: 1, omitidas: 0 },
    ],
  });
}

async function repetir(datos) {
  const conexion = await crearConexionRabbitMQ();
  try {
    const canal = await conexion.createConfirmChannel();
    await canal.assertQueue(cola, { durable: true });
    for (let i = 0; i < 8; i++) {
      canal.sendToQueue(cola, Buffer.from(JSON.stringify({ tipo: 'ExamenFinalizado', examenId: datos.id })),
        { persistent: true, messageId: datos.id });
    }
    await canal.waitForConfirms();
  } finally {
    await conexion.close();
  }
}

async function verificar() {
  const fase = process.env.RESULTADOS_FASE;
  const bd = crearPoolPostgres();
  try {
    const datos = fase === 'recuperado' ? JSON.parse(await readFile(archivos, 'utf8')) : await preparar();
    await http('GET', datos.url, 404, datos.ajeno);
    if (fase === 'caido') {
      assert.equal((await http('GET', datos.url, 202, datos.token)).estado, 'PENDIENTE');
      const pendiente = await bd.query('SELECT 1 FROM envios_examen_finalizado WHERE examen_id = $1 AND NOT publicado', [datos.id]);
      assert.equal(pendiente.rowCount, 1);
      await writeFile(archivos, JSON.stringify(datos), { mode: 0o600 });
      console.log('Resultado pendiente y evento conservado durante la caída de RabbitMQ.');
      return;
    }
    if (fase === 'duplicados') await repetir(datos);
    verificarNota(await esperarResultado(datos), datos);
    if (!fase) console.log('Cierre hasta nota consultable (incluido sondeo): ' + Math.round(performance.now() - datos.inicio) + ' ms.');
    if (fase === 'recuperado') {
      const { unlink } = require('node:fs/promises');
      await unlink(archivos);
    }
    const filas = await bd.query('SELECT detalle, puntaje_centesimos FROM resultados_examen WHERE examen_id = $1', [datos.id]);
    assert.equal(filas.rowCount, 1);
    assert.equal(filas.rows[0].puntaje_centesimos, 33_333);
    assert.deepEqual(filas.rows[0].detalle.map(p => p.correccion), ['correctas', 'incorrectas', 'omitidas']);
    const swagger = await fetch('http://127.0.0.1:3000/api-docs/swagger-ui-init.js');
    assert.ok((await swagger.text()).includes('/api/v1/resultados/{id}'));
    console.log('Resultados verificados con PostgreSQL, Redis, RabbitMQ y la API (' + (fase || 'normal') + ').');
  } finally {
    await bd.end();
  }
}

verificar().catch(error => { console.error(error); process.exitCode = 1; });
