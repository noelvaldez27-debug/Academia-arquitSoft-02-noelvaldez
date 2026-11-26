const assert = require('node:assert/strict');
const { randomInt, randomUUID } = require('node:crypto');
const ExcelJS = require('/app/node_modules/exceljs');
const base = 'http://127.0.0.1:3000';
const cantidad = Number(process.env.VUS);
const escalones = [50, 100, 250, 500, 1000, 1500, 2000];
assert.ok(Number.isInteger(cantidad) && (process.env.MODO_CAMPANA === 'si'
  ? escalones.includes(cantidad)
  : cantidad >= 1 && cantidad <= 10));
async function api(ruta, esperado, datos, token, metodo = 'POST') {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(base + ruta, { method: metodo, headers, body: datos && JSON.stringify(datos),
      redirect: 'error', signal: AbortSignal.timeout(10000) });
  } catch (error) {
    throw new Error('Falló HTTP local al preparar ' + metodo + ' ' + ruta + ' (' + (error.cause?.code ?? error.name) + ').');
  }
  assert.equal(res.status, esperado, ruta);
  return res.headers.get('content-type').includes('spreadsheetml') ? res.arrayBuffer() : res.json();
}
async function preparar() {
  const usuarios = '/api/usuarios';
  const banco = '/api/banco-preguntas';
  const { token } = await api(usuarios + '/login', 200, {
    correo: process.env.ADMIN_GENERAL_CORREO, password: process.env.ADMIN_GENERAL_PASSWORD,
  });
  const ciclo = await api(usuarios + '/ciclos', 201, {
    nombre: 'Ciclo k6 sintético', iniciaEl: '2026-01-01', terminaEl: '2027-12-31',
  }, token);
  const sedes = await api(usuarios + '/sedes', 200, undefined, token, 'GET');
  const cuentas = [];
  for (let i = 0; i < cantidad; i++) {
    const dni = String(randomInt(10000000, 100000000));
    const alta = await api(usuarios + '/estudiantes', 201, {
      dni, nombre: 'Postulante sintético ' + (i + 1), sedeId: String(sedes[i % sedes.length].id),
      carrera: 'Medicina', cicloId: ciclo.id,
    }, token);
    const excel = await api(usuarios + '/estudiantes/' + alta.id + '/credenciales', 200, undefined, token);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(Buffer.from(excel));
    const hoja = libro.getWorksheet(1);
    const correo = hoja.getCell('A2').value;
    const provisional = hoja.getCell('B2').value;
    const sesion = await api(usuarios + '/login', 200, { correo, password: provisional });
    assert.equal(sesion.cambioPasswordRequerido, true);
    const password = randomUUID();
    await api(usuarios + '/password', 200, { passwordActual: provisional, passwordNueva: password }, sesion.token, 'PATCH');
    cuentas.push({ correo, password });
  }
  const curso = await api(banco + '/cursos', 201, { nombre: 'Curso sintético humo ' + randomUUID() }, token);
  const pregunta = await api(banco + '/cursos/' + curso.id + '/preguntas', 201, {
    enunciado: 'Pregunta sintética', correcta: 'A', alternativas: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' },
  }, token);
  const simulacro = await api(banco + '/simulacros', 201, { duracionMinutos: 5, preguntas: [pregunta.id] }, token);
  process.stdout.write(JSON.stringify({ cicloId: ciclo.id, simulacroId: simulacro.id, cuentas }));
}
preparar().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
