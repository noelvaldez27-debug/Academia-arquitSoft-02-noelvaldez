const assert = require('node:assert/strict');
const { randomInt } = require('node:crypto');
const { readFile, readdir, writeFile } = require('node:fs/promises');
const { setTimeout: esperar } = require('node:timers/promises');
const { crearConexionRabbitMQ, crearPoolPostgres } = require('/app/dist/compartido/infraestructura');
const ExcelJS = require('/app/node_modules/exceljs');

const examenes = '/api/v1/examenes';
const usuarios = '/api/usuarios';
const banco = '/api/banco-preguntas';
const archivo = '/tmp/evalua-ranking-validacion.json';

async function enviar(metodo, ruta, token, datos) {
  const headers = token ? { authorization: 'Bearer ' + token } : {};
  if (datos) headers['content-type'] = 'application/json';
  return fetch('http://127.0.0.1:3000' + ruta, { method: metodo, headers, body: datos && JSON.stringify(datos) });
}

async function api(metodo, ruta, estado, token, datos) {
  const respuesta = await enviar(metodo, ruta, token, datos);
  assert.equal(respuesta.status, estado, metodo + ' ' + ruta);
  return respuesta.headers.get('content-type')?.includes('application/json') ? respuesta.json() : null;
}

async function sondear(ruta, token, cumple) {
  for (let i = 0; i < 120; i++) {
    const respuesta = await enviar('GET', ruta, token);
    if (respuesta.ok) {
      const datos = await respuesta.json();
      if (cumple(datos)) return datos;
    } else {
      assert.ok([404, 503].includes(respuesta.status), ruta + ' ' + respuesta.status);
    }
    await esperar(250);
  }
  assert.fail('No se alcanzó el estado esperado en ' + ruta);
}

async function login(correo, password) {
  return (await api('POST', usuarios + '/login', 200, null, { correo, password })).token;
}

async function preparar(admin) {
  const [sede] = await api('GET', usuarios + '/sedes', 200, admin);
  const postulantes = [];
  for (const condicion of ['LIBRE', 'MATRICULADO', 'LIBRE', 'LIBRE']) {
    const dni = String(randomInt(10_000_000, 100_000_000));
    const perfil = await api('POST', usuarios + '/estudiantes', 201, admin, {
      nombre: 'Postulante de prueba', dni, sedeId: String(sede.id), carrera: 'Medicina', condicion,
    });
    postulantes.push({ id: perfil.id, dni, token: await login(dni + '@sofia.edu', dni) });
  }
  const curso = await api('POST', banco + '/cursos', 201, admin, { nombre: 'Curso ' + randomInt(1_000_000) });
  const pregunta = await api('POST', banco + '/cursos/' + curso.id + '/preguntas', 201, admin, {
    enunciado: 'Pregunta de prueba', correcta: 'A', alternativas: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' },
  });
  const simulacro = await api('POST', banco + '/simulacros', 201, admin,
    { duracionMinutos: 5, preguntas: [pregunta.id] });
  return { sede, postulantes, id: simulacro.id, cursoId: curso.id };
}

async function duplicar(id) {
  const conexion = await crearConexionRabbitMQ();
  try {
    const canal = await conexion.createConfirmChannel();
    await canal.assertQueue('ranking.actualizar', { durable: true });
    for (let i = 0; i < 4; i++) canal.sendToQueue('ranking.actualizar', Buffer.from(id), { persistent: true });
    await canal.waitForConfirms();
  } finally {
    await conexion.close();
  }
}

async function verificarMigracion() {
  const pool = crearPoolPostgres();
  const bd = await pool.connect();
  try {
    await bd.query('BEGIN');
    await bd.query('CREATE SCHEMA compatibilidad_ranking');
    await bd.query('SET LOCAL search_path TO compatibilidad_ranking');
    const migraciones = (await readdir('/app/migraciones')).filter(nombre => nombre.endsWith('.sql')).sort();
    const aplicar = async nombre => bd.query(await readFile('/app/migraciones/' + nombre, 'utf8'));
    for (const nombre of migraciones.filter(nombre => nombre < '009')) await aplicar(nombre);
    await bd.query(`INSERT INTO usuarios (id, nombre, dni, correo, password_hash, rol, sede_id, carrera)
      VALUES (10001, 'Usuario anterior', '11111111', 'anterior@example.test', 'hash-sintetico', 'POSTULANTE',
        (SELECT id FROM sedes WHERE nombre = 'Hana'), 'MEDICINA')`);
    await bd.query(`INSERT INTO examenes_rendicion (id, postulante_id, simulacro_id, inicio, vence, cierre, respuestas)
      VALUES ('anterior', '10001', 'simulacro-anterior', '2026-01-01 12:00Z', '2026-01-01 12:05Z',
        '2026-01-01 12:01Z', '[]')`);
    await bd.query(`INSERT INTO resultados_examen (examen_id, postulante_id, simulacro_id,
      puntaje_centesimos, correctas, incorrectas, omitidas, por_curso, detalle)
      VALUES ('anterior', '10001', 'simulacro-anterior', 0, 0, 0, 1,
        '[{"cursoId":"curso","correctas":0,"incorrectas":0,"omitidas":1}]',
        '[{"preguntaId":"pregunta","cursoId":"curso","correccion":"omitidas"}]')`);
    for (const nombre of migraciones.filter(nombre => nombre >= '009')) await aplicar(nombre);
    const legado = await bd.query(`SELECT u.activo, u.condicion, e.carrera_inicial, e.sede_inicial,
      e.condicion_inicial, r.puntaje_centesimos
      FROM usuarios u JOIN examenes_rendicion e ON e.postulante_id = u.id::text
      JOIN resultados_examen r ON r.examen_id = e.id WHERE u.id = 10001`);
    assert.deepEqual(legado.rows, [{
      activo: true, condicion: null, carrera_inicial: null, sede_inicial: null, condicion_inicial: null, puntaje_centesimos: 0,
    }]);
    console.log('Migraciones 009 en adelante conservaron la cuenta, el intento y la nota previos.');
  } finally {
    await bd.query('ROLLBACK');
    bd.release();
    await pool.end();
  }
}

async function verificar() {
  const fase = process.env.RANKING_FASE;
  if (fase === 'compatibilidad') return verificarMigracion();
  const admin = await login(process.env.ADMIN_GENERAL_CORREO, process.env.ADMIN_GENERAL_PASSWORD);
  if (fase === 'recuperado') {
    const { id, examenId, dni } = JSON.parse(await readFile(archivo, 'utf8'));
    const token = await login(dni + '@sofia.edu', dni);
    await sondear('/api/v1/resultados/' + examenId, token, dato => dato.estado === 'PROCESADO');
    await sondear('/api/v1/rankings/' + id + '/propio', token, dato => dato.definitiva && dato.general.puesto === 1);
    console.log('RabbitMQ recuperado, resultado tardío incorporado y ranking definitivo.');
    return;
  }
  const { sede, postulantes, id, cursoId } = await preparar(admin);
  const [a, b, c, d] = postulantes;
  const inicio = examenes + '/iniciar';
  const cierre = examenes + '/simulacros/' + id + '/cierre';
  const ranking = '/api/v1/rankings/' + id;
  const iniciar = (persona, estado = 200) => api('POST', inicio, estado, persona.token, { simulacroId: id });
  const finalizar = persona => api('POST', examenes + '/' + persona.examen.id + '/finalizar', 200, persona.token);
  a.examen = await iniciar(a);
  await api('POST', cierre, 403, a.token);
  if (fase === 'caido') {
    const primera = await api('POST', cierre, 202, admin);
    await finalizar(a);
    assert.equal((await api('GET', '/api/v1/resultados/' + a.examen.id, 202, a.token)).estado, 'PENDIENTE');
    const repetida = await api('POST', cierre, 202, admin);
    assert.deepEqual(repetida, primera);
    await writeFile(archivo, JSON.stringify({ id, examenId: a.examen.id, dni: a.dni }), { mode: 0o600 });
    console.log('El cierre general siguió pendiente durante la caída de RabbitMQ.');
    return;
  }
  b.examen = await iniciar(b);
  for (const persona of [a, b]) {
    await api('PUT', examenes + '/' + persona.examen.id + '/respuestas', 200, persona.token, {
      numero: 1, alternativa: 'A', revisionBase: 0, operacionId: 'respuesta',
    });
  }
  await api('PATCH', usuarios + '/estudiantes/' + a.id + '/condicion', 204, admin, { condicion: 'MATRICULADO' });
  const tiempo = performance.now();
  await finalizar(a);
  await sondear('/api/v1/resultados/' + a.examen.id, a.token, dato => dato.estado === 'PROCESADO');
  const demoraNota = Math.round(performance.now() - tiempo);
  await sondear(ranking + '/propio', a.token, dato => !dato.definitiva && dato.general.puesto === 1);
  const demoraRanking = Math.round(performance.now() - tiempo);
  const [solicitud, carrera] = await Promise.all([
    api('POST', cierre, 202, admin), enviar('POST', inicio, c.token, { simulacroId: id }),
  ]);
  assert.ok([200, 409].includes(carrera.status));
  if (carrera.ok) c.examen = await carrera.json();
  assert.equal((await iniciar(b)).id, b.examen.id);
  await iniciar(d, 409);
  await finalizar(b);
  if (c.examen) await finalizar(c);
  await duplicar(id);
  const definitivo = await sondear(ranking + '?carrera=medicina&sedeId=' + sede.id, admin, dato => dato.definitiva);
  assert.deepEqual(definitivo.filas.map(({ puesto, puntaje }) => [puesto, puntaje]),
    c.examen ? [[1, 1000], [1, 1000], [3, 0]] : [[1, 1000], [1, 1000]]);
  const cerrado = await api('POST', cierre, 200, admin);
  assert.equal(cerrado.solicitadoEn, solicitud.solicitadoEn);
  assert.ok(cerrado.cerradoEn);
  await api('GET', ranking, 403, a.token);
  await api('PATCH', usuarios + '/' + a.id + '/desactivar', 200, admin);
  assert.equal((await api('GET', ranking, 200, admin)).filas.length, definitivo.filas.length);
  const dniDocente = String(randomInt(10_000_000, 100_000_000));
  const docente = await api('POST', usuarios + '/docentes', 201, admin, { nombre: 'Docente de prueba', dni: dniDocente });
  const tokenDocente = await login(docente.correo, dniDocente);
  const rutaCurso = ranking + '/reportes/cursos/' + cursoId;
  await api('GET', rutaCurso, 403, tokenDocente);
  const rutaAsignacion = banco + '/cursos/' + cursoId + '/docentes/' + docente.id;
  await api('PUT', rutaAsignacion, 200, admin);
  const agregado = await api('GET', rutaCurso, 200, tokenDocente);
  assert.deepEqual(agregado.resumen, {
    calificados: definitivo.filas.length, correctas: 2, incorrectas: 0, omitidas: c.examen ? 1 : 0,
  });
  await api('DELETE', rutaAsignacion, 200, admin);
  await api('GET', rutaCurso, 403, tokenDocente);
  const rutaReporte = ranking + '/reportes/meritos?condicion=LIBRE';
  const reporte = await api('GET', rutaReporte, 200, admin);
  assert.ok(reporte.filas.some(fila => fila.postulanteId === a.id && fila.condicion === 'LIBRE'));
  const exportado = await enviar('GET', rutaReporte + '&formato=xlsx', admin);
  assert.equal(exportado.status, 200);
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(Buffer.from(await exportado.arrayBuffer()));
  assert.equal(libro.worksheets[0].actualRowCount, reporte.filas.length + 1);
  const participacion = await api('GET', ranking + '/reportes/participacion', 200, admin);
  assert.equal(participacion.resumen.inscritos, null);
  assert.equal(participacion.resumen.enCurso, 0);
  assert.equal(participacion.resumen.calificados, definitivo.filas.length);
  console.log(`Ranking y Excel validados. Cierre hasta nota: ${demoraNota} ms. Cierre hasta puesto: ${demoraRanking} ms. Carrera inicio-cierre: HTTP ${carrera.status}.`);
}

verificar().catch(error => { console.error(error); process.exitCode = 1; });
