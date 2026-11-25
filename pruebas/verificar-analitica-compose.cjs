const assert = require('node:assert/strict');
const { randomInt, randomUUID } = require('node:crypto');
const { setTimeout: esperar } = require('node:timers/promises');
const { readdir, readFile } = require('node:fs/promises');

const banco = '/api/banco-preguntas';
const usuarios = '/api/usuarios';
const analitica = '/api/v1/analitica';
const examenes = '/api/v1/examenes';
const base = 'http://127.0.0.1:3000';

async function api(metodo, ruta, codigo, token, contenido) {
  const headers = token ? { authorization: 'Bearer ' + token } : {};
  if (contenido) headers['content-type'] = 'application/json';
  const respuesta = await fetch(base + ruta, {
    method: metodo, headers, body: contenido && JSON.stringify(contenido), signal: AbortSignal.timeout(10000),
  });
  const texto = await respuesta.text();
  assert.equal(respuesta.status, codigo, metodo + ' ' + ruta + ' (' + respuesta.status + ')');
  return texto ? JSON.parse(texto) : undefined;
}

async function login(correo, password) {
  return (await api('POST', usuarios + '/login', 200, undefined, { correo, password })).token;
}

async function verificarCompatibilidad() {
  const { crearPoolPostgres } = require('/app/dist/compartido/infraestructura');
  const pool = crearPoolPostgres();
  const bd = await pool.connect();
  const esquema = 'compatibilidad_analitica_' + randomUUID().replaceAll('-', '');
  try {
    await bd.query('BEGIN');
    await bd.query('CREATE SCHEMA ' + esquema);
    await bd.query('SET LOCAL search_path TO ' + esquema);
    const migraciones = (await readdir('/app/migraciones')).filter(nombre => nombre.endsWith('.sql')).sort();
    const aplicar = async nombre => bd.query(await readFile('/app/migraciones/' + nombre, 'utf8'));
    for (const nombre of migraciones.filter(nombre => nombre < '015')) await aplicar(nombre);
    const preguntas = [{ id: 'p1', cursoId: 'c1', enunciado: 'Legado', alternativas: {
      A: 'a', B: 'b', C: 'c', D: 'd', E: 'e',
    }, correcta: 'A' }];
    await bd.query('INSERT INTO configuraciones_simulacro VALUES ($1, 5, $2)', ['s1', '["p1"]']);
    await bd.query('INSERT INTO versiones_simulacro VALUES ($1, 5, $2)', ['s1', JSON.stringify(preguntas)]);
    for (const nombre of migraciones.filter(nombre => nombre >= '015')) await aplicar(nombre);
    const { crearConsultaPreguntasHistoricas } = require('/app/dist/modules/banco-preguntas');
    const [legado] = await crearConsultaPreguntasHistoricas(bd)(['s1']);
    assert.equal(legado.tema, null);
    assert.equal(legado.enunciado, 'Legado');
    assert.ok(!('correcta' in legado));
  } finally {
    await bd.query('ROLLBACK');
    bd.release();
    await pool.end();
  }
}

async function verificar() {
  assert.ok(['local', 'simulada'].includes(process.env.ANALITICA_IA), 'Usa ANALITICA_IA=simulada o local.');
  await verificarCompatibilidad();
  const admin = await login(process.env.ADMIN_GENERAL_CORREO, process.env.ADMIN_GENERAL_PASSWORD);
  const [sede, otraSede] = await api('GET', usuarios + '/sedes', 200, admin);
  const dni = String(randomInt(10_000_000, 100_000_000));
  await api('POST', usuarios + '/estudiantes', 201, admin, {
    nombre: 'Postulante de integración', dni, sedeId: String(sede.id), carrera: 'Medicina', condicion: 'LIBRE',
  });
  const postulante = await login(dni + '@sofia.edu', dni);
  const miHistorial = () => api('GET', analitica + '/mi-historial', 200, postulante);
  const recomendar = () => api('POST', analitica + '/mi-recomendacion', 200, postulante);
  const crearCurso = () => api('POST', banco + '/cursos', 201, admin, { nombre: 'Curso sintético ' + randomUUID() });
  const c = await crearCurso();
  const otro = await crearCurso();
  const rutaTemas = cursoId => banco + '/cursos/' + cursoId + '/temas';
  const tema = await api('POST', rutaTemas(c.id), 201, admin, { nombre: 'Ecuaciones' });
  const dniDocente = String(randomInt(10_000_000, 100_000_000));
  const docente = await api('POST', usuarios + '/docentes', 201, admin, { nombre: 'Docente de integración', dni: dniDocente });
  const tokenDocente = await login(docente.correo, dniDocente);
  await api('GET', rutaTemas(c.id), 403, tokenDocente);
  await api('PUT', banco + '/cursos/' + c.id + '/docentes/' + docente.id, 200, admin);
  assert.equal((await api('GET', rutaTemas(c.id), 200, tokenDocente))[0].id, tema.id);
  const correoSede = randomUUID() + '@prueba.invalid';
  const passwordSede = randomUUID();
  await api('POST', usuarios + '/administradores-sede', 201, admin, {
    nombre: 'Administrador de sede de integración', correo: correoSede, passwordInicial: passwordSede,
    sedeId: String(sede.id),
  });
  const tokenSede = await login(correoSede, passwordSede);
  await api('POST', rutaTemas(c.id), 409, admin, { nombre: ' ecuaciones ' });
  await api('POST', rutaTemas(c.id), 403, postulante, { nombre: 'Otro' });
  const ajeno = await api('POST', rutaTemas(otro.id), 201, admin, { nombre: 'Ecuaciones' });
  const preguntas = banco + '/cursos/' + c.id + '/preguntas';
  const contenido = { correcta: 'A', alternativas: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' } };
  await api('POST', preguntas, 400, admin, { ...contenido, enunciado: 'Otra', temaId: ajeno.id });
  assert.deepEqual(await miHistorial(), { historial: [], porCurso: [] });
  assert.equal((await recomendar()).estado, 'evidencia_insuficiente');
  const ids = [];
  for (let i = 0; i < 5; i++) {
    const pregunta = await api('POST', preguntas, 201, admin, {
      ...contenido, enunciado: 'Sintética ' + i, ...(i < 4 && { temaId: tema.id }),
    });
    ids.push(pregunta.id);
  }
  const simulacro = await api('POST', banco + '/simulacros', 201, admin, { duracionMinutos: 5, preguntas: ids });
  const intento = await api('POST', examenes + '/iniciar', 200, postulante, { simulacroId: simulacro.id });
  await api('PUT', banco + '/temas/' + tema.id, 200, admin, { nombre: 'Nombre posterior' });
  await api('PATCH', banco + '/temas/' + tema.id + '/desactivar', 200, admin);
  assert.deepEqual(await api('GET', rutaTemas(c.id), 200, admin), []);
  await api('POST', preguntas, 400, admin, { ...contenido, enunciado: 'Inactiva', temaId: tema.id });
  await api('POST', examenes + '/' + intento.id + '/finalizar', 200, postulante);
  let historial;
  for (let i = 0; i < 80; i++) {
    historial = await miHistorial();
    if (historial.historial.length) break;
    await esperar(250);
  }
  assert.equal(historial.historial[0]?.puntaje, 0);
  assert.equal(historial.porCurso[0]?.omitidas, 5);
  assert.equal(historial.porCurso[0]?.desempeno, 0);
  const agregados = await api('GET', analitica + '/estadisticas?simulacroId=' + simulacro.id +
    '&sedeId=' + encodeURIComponent(sede.id), 200, admin);
  assert.equal(agregados.porPregunta.length, 5);
  assert.equal(agregados.porCurso[0].tasaOmisiones, 100);
  assert.equal(agregados.porTema.find(fila => fila.temaId === null).total, 1);
  assert.deepEqual(agregados.porTema.find(fila => fila.temaId === tema.id).nombresHistoricos, ['Ecuaciones']);
  assert.equal(agregados.porPregunta.some(fila => 'huellaInterna' in fila || 'correcta' in fila), false);
  await api('GET', analitica + '/estadisticas', 403, postulante);
  await api('GET', analitica + '/mi-historial', 403, admin);
  const rutaEstadisticas = analitica + '/estadisticas?simulacroId=' + simulacro.id;
  assert.equal((await api('GET', rutaEstadisticas, 200, tokenDocente)).porCurso[0].total, 5);
  await api('GET', rutaEstadisticas + '&cursoId=' + otro.id, 403, tokenDocente);
  await api('POST', analitica + '/mi-recomendacion', 403, tokenDocente);
  assert.equal((await api('GET', rutaEstadisticas, 200, tokenSede)).porCurso[0].total, 5);
  await api('GET', rutaEstadisticas + '&sedeId=' + otraSede.id, 403, tokenSede);
  const [a, b] = await Promise.all([recomendar(), recomendar()]);
  assert.deepEqual(a, b);
  assert.equal(a.origen, process.env.ANALITICA_IA === 'simulada' ? 'ia' : 'local');
  assert.deepEqual(a.cursos, [c.id]);
  const nuevo = await api('POST', banco + '/simulacros', 201, admin, { duracionMinutos: 5, preguntas: ids });
  const intentoNuevo = await api('POST', examenes + '/iniciar', 200, postulante, { simulacroId: nuevo.id });
  await api('POST', examenes + '/' + intentoNuevo.id + '/finalizar', 200, postulante);
  for (let i = 0; i < 80; i++) {
    historial = await miHistorial();
    if (historial.historial.length === 2) break;
    await esperar(250);
  }
  assert.equal(historial.historial.length, 2);
  const renovada = await recomendar();
  assert.notEqual(renovada.generadaEn, a.generadaEn);
  assert.deepEqual(await recomendar(), renovada);
  console.log('Temas, congelamiento histórico, RF12, aislamiento y recomendación concurrente verificados (' + a.origen + ').');
}

verificar().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
