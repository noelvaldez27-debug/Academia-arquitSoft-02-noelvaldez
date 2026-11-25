const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { setTimeout: esperar } = require('node:timers/promises');
const ExcelJS = require('exceljs');

const base = 'http://127.0.0.1:3000';
const api = '/api/usuarios';

async function consultar(ruta, esperado, { metodo = 'GET', token, datos } = {}) {
  const headers = {};
  if (token) headers.authorization = 'Bearer ' + token;
  if (datos && !(datos instanceof FormData)) headers['content-type'] = 'application/json';
  const respuesta = await fetch(base + ruta, {
    method: metodo, headers,
    body: datos instanceof FormData ? datos : datos && JSON.stringify(datos),
  });
  assert.equal(respuesta.status, esperado, metodo + ' ' + ruta);
  return respuesta;
}

async function verificar() {
  const correoGeneral = 'general@prueba.invalid';
  const passwordGeneral = randomUUID();
  execFileSync(process.execPath, ['dist/scripts/migrar.js'], { stdio: 'inherit' });
  execFileSync(process.execPath, ['dist/scripts/seed-admin.js'], {
    env: {
      ...process.env, ADMIN_GENERAL_NOMBRE: 'Administrador de prueba',
      ADMIN_GENERAL_CORREO: correoGeneral, ADMIN_GENERAL_PASSWORD: passwordGeneral,
    },
  });
  const iniciarSesion = async (correo, password) => (await (
    await consultar(api + '/login', 200, { metodo: 'POST', datos: { correo, password } })
  ).json()).token;
  const general = await iniciarSesion(correoGeneral, passwordGeneral);
  const sedes = await (await consultar(api + '/sedes', 200, { token: general })).json();
  for (const nombre of ['Hana', 'Urin', 'Central']) {
    assert.ok(sedes.some(sede => sede.nombre === nombre));
  }
  const hana = sedes.find(sede => sede.nombre === 'Hana');
  const urin = sedes.find(sede => sede.nombre === 'Urin');
  const correoSede = 'hana@prueba.invalid';
  const passwordSede = randomUUID();
  await consultar(api + '/administradores-sede', 201, {
    metodo: 'POST', token: general,
    datos: { nombre: 'Administrador Hana', correo: correoSede, passwordInicial: passwordSede, sedeId: String(hana.id) },
  });
  const adminSede = await iniciarSesion(correoSede, passwordSede);
  for (const [indice, sede] of sedes.entries()) {
    await consultar(api + '/estudiantes', 201, {
      metodo: 'POST', token: sede.id === hana.id ? adminSede : general,
      datos: { nombre: 'Estudiante ' + sede.nombre, dni: String(41000000 + indice), sedeId: String(sede.id), carrera: 'Medicina', condicion: 'LIBRE' },
    });
  }
  await consultar(api + '?sedeId=' + urin.id, 403, { token: adminSede });
  await consultar(api + '/estudiantes', 403, {
    metodo: 'POST', token: adminSede,
    datos: { nombre: 'Fuera de sede', dni: '42000000', sedeId: String(urin.id), carrera: 'Medicina', condicion: 'LIBRE' },
  });

  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Estudiantes');
  hoja.addRows([
    ['Nombre', 'DNI', 'Sede', 'Carrera', 'Condición'],
    ['Estudiante nuevo', '43000000', 'Hana', 'Medicina', 'LIBRE'],
    ['Nombre diferente', String(41000000 + sedes.indexOf(hana)), 'Hana', 'Medicina', 'LIBRE'],
    ['Otra sede', '44000000', 'Urin', 'Medicina', 'MATRICULADO'],
  ]);
  const bytes = await libro.xlsx.writeBuffer();
  async function cargar() {
    const formulario = new FormData();
    formulario.append('archivo', new Blob([bytes]), 'estudiantes.xlsx');
    const subida = await consultar(api + '/cargas-masivas', 202, {
      metodo: 'POST', token: adminSede, datos: formulario,
    });
    const { id } = await subida.json();
    const ruta = api + '/cargas-masivas/' + id;
    assert.equal(subida.headers.get('location'), ruta);
    for (let intento = 0; intento < 30; intento++) {
      const resultado = await (await consultar(ruta, 200, { token: adminSede })).json();
      assert.notEqual(resultado.estado, 'FALLIDA');
      if (resultado.estado === 'COMPLETADA') return resultado;
      await esperar(500);
    }
    assert.fail('El consumidor no completó la carga en 15 segundos');
  }
  const primera = await cargar();
  assert.deepEqual([primera.totalFilas, primera.creadas, primera.yaExistian, primera.rechazadas], [3, 1, 1, 1]);
  assert.deepEqual(primera.errores.map(error => error.fila), [4]);
  assert.deepEqual(primera.avisos.map(aviso => aviso.fila), [3]);
  const repetida = await cargar();
  assert.deepEqual([repetida.creadas, repetida.yaExistian, repetida.rechazadas], [0, 2, 1]);
  const swagger = await (await consultar('/api-docs/swagger-ui-init.js', 200)).text();
  assert.ok(swagger.includes(api + '/cargas-masivas'));
  console.log('Punta a punta validada: migraciones, sesiones, tres sedes, aislamiento, carga XLSX, aviso y reenvío.');
}

verificar().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
