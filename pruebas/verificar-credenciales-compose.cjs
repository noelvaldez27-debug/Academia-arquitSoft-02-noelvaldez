const assert = require('node:assert/strict');
const { randomInt, randomUUID } = require('node:crypto');
const ExcelJS = require('/app/node_modules/exceljs');
const { setTimeout: pausa } = require('node:timers/promises');

const api = 'http://127.0.0.1:3000/api/usuarios';

async function enviar(metodo, ruta, token, datos) {
  const headers = token ? { authorization: 'Bearer ' + token } : {};
  let body;
  if (datos) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(datos);
  }
  return fetch(api + ruta, { method: metodo, headers, body, redirect: 'error' });
}

async function esperar(metodo, ruta, estado, token, datos) {
  const respuesta = await enviar(metodo, ruta, token, datos);
  assert.equal(respuesta.status, estado, metodo + ' ' + ruta);
  return respuesta;
}

async function login(correo, password, esperado = 200) {
  const res = await esperar('POST', '/login', esperado, null, { correo, password });
  return res.json();
}

async function verificar() {
  let listo = false;
  for (let i = 0; i < 40 && !listo; i++) {
    listo = await fetch('http://127.0.0.1:3000/health').then(res => res.ok, () => false);
    if (!listo) await pausa(250);
  }
  assert.ok(listo, 'La API local no responde.');
  const { token: admin } = await login(process.env.ADMIN_GENERAL_CORREO, process.env.ADMIN_GENERAL_PASSWORD);
  const [sede] = await (await esperar('GET', '/sedes', 200, admin)).json();
  const dni = String(randomInt(10_000_000, 100_000_000));
  const perfil = await (await esperar('POST', '/estudiantes', 201, admin, {
    nombre: 'Postulante sintético de credenciales', dni, sedeId: String(sede.id), carrera: 'MEDICINA',
  })).json();
  assert.equal('password' in perfil || 'passwordHash' in perfil, false);
  const correo = dni + '@sofia.edu';
  await login(correo, dni, 401);
  const ruta = '/estudiantes/' + perfil.id + '/credenciales';
  const otroCorreo = randomUUID() + '@prueba.invalid';
  const otraClave = randomUUID();
  await esperar('POST', '/administradores-sede', 201, admin, {
    nombre: 'Administrador sintético de sede', correo: otroCorreo, passwordInicial: otraClave, sedeId: String(sede.id),
  });
  const otro = (await login(otroCorreo, otraClave)).token;
  await esperar('POST', ruta, 404, otro);
  const descargas = await Promise.all([enviar('POST', ruta, admin), enviar('POST', ruta, admin)]);
  assert.deepEqual(descargas.map(res => res.status).sort(), [200, 404]);
  const descarga = descargas.find(res => res.ok);
  assert.match(descarga.headers.get('cache-control'), /no-store/);
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(Buffer.from(await descarga.arrayBuffer()));
  const hoja = libro.getWorksheet(1);
  assert.equal(hoja.getCell('A2').value, correo);
  const provisional = hoja.getCell('B2').value;
  assert.ok(typeof provisional === 'string' && provisional.length >= 24);
  const limitado = await login(correo, provisional);
  assert.equal(limitado.cambioPasswordRequerido, true);
  const consultaAcademica = token => fetch('http://127.0.0.1:3000/api/v1/analitica/mi-historial', {
    headers: { authorization: 'Bearer ' + token }, redirect: 'error',
  });
  assert.equal((await consultaAcademica(limitado.token)).status, 403);
  const nueva = randomUUID();
  await esperar('PATCH', '/password', 200, limitado.token, { passwordActual: provisional, passwordNueva: nueva });
  assert.equal((await consultaAcademica(limitado.token)).status, 401);
  await login(correo, provisional, 401);
  const sesion = await login(correo, nueva);
  assert.equal((await consultaAcademica(sesion.token)).status, 200);
  if (process.env.VERIFICAR_ARCHIVO === 'si') {
    const banco = 'http://127.0.0.1:3000/api/banco-preguntas';
    const rendicion = 'http://127.0.0.1:3000/api/v1/examenes';
    async function recurso(base, ruta, token, datos) {
      const res = await fetch(base + ruta, { method: 'POST', headers: {
        authorization: 'Bearer ' + token, 'content-type': 'application/json',
      }, body: datos && JSON.stringify(datos) });
      assert.ok(res.ok, ruta + ' ' + res.status);
      return res.json();
    }
    const curso = await recurso(banco, '/cursos', admin, { nombre: 'Curso sintético' });
    const pregunta = await recurso(banco, '/cursos/' + curso.id + '/preguntas', admin, {
      enunciado: 'Pregunta sintética', correcta: 'A', alternativas: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' },
    });
    const sim = await recurso(banco, '/simulacros', admin, { duracionMinutos: 2, preguntas: [pregunta.id] });
    const intento = await recurso(rendicion, '/iniciar', sesion.token, { simulacroId: sim.id });
    const archivar = '/estudiantes/archivar';
    await esperar('POST', archivar, 409, admin, { ids: [perfil.id] });
    await recurso(rendicion, '/' + intento.id + '/finalizar', sesion.token);
    const primerArchivo = await esperar('POST', archivar, 200, admin, { ids: [perfil.id, perfil.id] });
    assert.deepEqual(await primerArchivo.json(), { archivados: 1 });
    const repetido = await esperar('POST', archivar, 200, admin, { ids: [perfil.id] });
    assert.deepEqual(await repetido.json(), { archivados: 0 });
    assert.equal((await consultaAcademica(sesion.token)).status, 401);
    await login(correo, nueva, 401);
    const habituales = await (await esperar('GET', '/?rol=POSTULANTE&limite=100', 200, admin)).json();
    const archivados = await (await esperar('GET', '/?archivados=true&limite=100', 200, admin)).json();
    assert.ok(!habituales.usuarios.some(usuario => usuario.id === perfil.id));
    assert.ok(archivados.usuarios.some(usuario => usuario.id === perfil.id));
  }
  const libroCarga = new ExcelJS.Workbook();
  const hojaCarga = libroCarga.addWorksheet('Datos');
  hojaCarga.addRow(['Nombre', 'DNI', 'Sede', 'Carrera']);
  const dniLote = String(randomInt(10_000_000, 100_000_000));
  hojaCarga.addRow(['Postulante sintético por lote', dniLote, sede.nombre, 'Medicina']);
  const formulario = new FormData();
  formulario.append('archivo', new Blob([await libroCarga.xlsx.writeBuffer()]), 'postulantes.xlsx');
  const carga = await fetch(api + '/cargas-masivas', {
    method: 'POST', headers: { authorization: 'Bearer ' + admin }, body: formulario, redirect: 'error',
  });
  assert.equal(carga.status, 202);
  const rutaCarga = '/cargas-masivas/' + (await carga.json()).id;
  let resumen;
  for (let i = 0; i < 40; i++) {
    resumen = await (await esperar('GET', rutaCarga, 200, admin)).json();
    if (resumen.estado === 'COMPLETADA') break;
    await pausa(250);
  }
  assert.equal(resumen.estado, 'COMPLETADA');
  assert.equal(resumen.creadas, 1);
  const archivoLote = await esperar('POST', rutaCarga + '/credenciales', 200, admin);
  const resultadoLote = new ExcelJS.Workbook();
  await resultadoLote.xlsx.load(Buffer.from(await archivoLote.arrayBuffer()));
  const credencialLote = resultadoLote.getWorksheet(1);
  assert.equal(credencialLote.getCell('A2').value, dniLote + '@sofia.edu');
  assert.notEqual(credencialLote.getCell('B2').value, provisional);
  assert.equal((await login(dniLote + '@sofia.edu', credencialLote.getCell('B2').value)).cambioPasswordRequerido, true);
  await esperar('POST', rutaCarga + '/credenciales', 404, admin);
  const { crearPoolPostgres } = require('/app/dist/compartido/infraestructura');
  const pool = crearPoolPostgres();
  try {
    await pool.query('UPDATE usuarios SET password_provisional_hasta = now() WHERE correo = $1', [dniLote + '@sofia.edu']);
    await login(dniLote + '@sofia.edu', credencialLote.getCell('B2').value, 401);
  } finally {
    await pool.end();
  }
  console.log('Credencial provisional, alcance, descarga concurrente y rotación de sesión verificados.');
}
verificar().catch(error => {
  console.error(error.name, error.message);
  process.exitCode = 1;
});
