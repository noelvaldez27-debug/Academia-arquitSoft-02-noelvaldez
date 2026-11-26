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
  const comprobarPadron = process.env.VERIFICAR_PADRON === 'si';
  const cicloInicial = comprobarPadron ? await (await esperar('POST', '/ciclos', 201, admin, {
    nombre: 'Ciclo para el padrón', iniciaEl: '2026-01-01', terminaEl: '2026-12-31',
  })).json() : null;
  const dni = String(randomInt(10_000_000, 100_000_000));
  const perfil = await (await esperar('POST', '/estudiantes', 201, admin, {
    nombre: 'Postulante sintético de credenciales', dni, sedeId: String(sede.id), carrera: 'MEDICINA',
    ...(cicloInicial && { cicloId: cicloInicial.id }),
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
  let ciclo;
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
    const reporte = async () => {
      const res = await fetch('http://127.0.0.1:3000/api/v1/rankings/' + sim.id +
        '/reportes/participacion?sedeId=' + sede.id + '&carrera=MEDICINA', {
        headers: { authorization: 'Bearer ' + admin },
      });
      assert.equal(res.status, 200);
      return (await res.json()).resumen;
    };
    let matriculaTardia;
    if (cicloInicial) {
      const previo = await fetch(rendicion + '/iniciar', { method: 'POST', headers: {
        authorization: 'Bearer ' + sesion.token, 'content-type': 'application/json',
      }, body: JSON.stringify({ simulacroId: sim.id }) });
      assert.equal(previo.status, 409);
      const habilitar = () => recurso(rendicion, '/simulacros/' + sim.id + '/habilitar', admin, { cicloId: cicloInicial.id });
      const [primera, segunda] = await Promise.all([habilitar(), habilitar()]);
      assert.deepEqual(primera, segunda);
      assert.deepEqual(await reporte(), { inscritos: 1, participantes: 0, noParticipantes: 1,
        porcentajeParticipacion: 0, enCurso: 0, finalizados: 0, calificados: 0 });
      matriculaTardia = await (await esperar('POST', '/estudiantes', 201, admin, {
        nombre: 'Postulante sintético posterior al padrón', dni: String(randomInt(10_000_000, 100_000_000)),
        sedeId: String(sede.id), carrera: 'MEDICINA', cicloId: cicloInicial.id,
      })).json();
      assert.equal((await reporte()).inscritos, 1);
      await esperar('POST', '/ciclos/' + cicloInicial.id + '/cierre', 409, admin);
    }
    const intento = await recurso(rendicion, '/iniciar', sesion.token, { simulacroId: sim.id });
    if (process.env.VERIFICAR_REDIS === 'si') {
      const url = rendicion + '/' + intento.id;
      const headers = { authorization: 'Bearer ' + sesion.token, 'content-type': 'application/json' };
      const marca = await fetch(url + '/respuestas', { method: 'PUT', headers, body: JSON.stringify({
        numero: 1, alternativa: 'B', revisionBase: 0, operacionId: 'marca-sintetica-redis',
      }) });
      assert.equal(marca.status, 200);
      const referencia = await marca.json();
      console.log('LISTO_REDIS', intento.id);
      const consultar = () => fetch(url, { headers, signal: AbortSignal.timeout(5000) });
      let inicioInterrupcion;
      for (let i = 0; i < 120; i++) {
        const estado = await consultar();
        if (estado.status === 503) { inicioInterrupcion = Date.now(); break; }
        assert.equal(estado.status, 200);
        await pausa(250);
      }
      assert.ok(inicioInterrupcion, 'No se observó la interrupción controlada de Redis.');
      console.log('REDIS_INTERRUMPIDO 503');
      let recuperado;
      for (let i = 0; i < 120; i++) {
        const estado = await consultar();
        if (estado.ok) { recuperado = await estado.json(); break; }
        assert.equal(estado.status, 503);
        await pausa(250);
      }
      assert.ok(recuperado, 'Redis no se recuperó durante el recorrido.');
      assert.deepEqual(recuperado.respuestas, [referencia]);
      console.log('REDIS_RECUPERADO_MS', Date.now() - inicioInterrupcion, 'MARCAS_CONSERVADAS', recuperado.respuestas.length);
    }
    const archivar = '/estudiantes/archivar';
    await esperar('POST', archivar, 409, admin, { ids: [perfil.id] });
    const inicioFinalizacion = Date.now();
    await recurso(rendicion, '/' + intento.id + '/finalizar', sesion.token);
    const primerArchivo = await esperar('POST', archivar, 200, admin, { ids: [perfil.id, perfil.id] });
    assert.deepEqual(await primerArchivo.json(), { archivados: 1 });
    const repetido = await esperar('POST', archivar, 200, admin, { ids: [perfil.id] });
    assert.deepEqual(await repetido.json(), { archivados: 0 });
    assert.equal((await consultaAcademica(sesion.token)).status, 401);
    await login(correo, nueva, 401);
    if (cicloInicial) {
      const cerrar = () => fetch(rendicion + '/simulacros/' + sim.id + '/cierre', {
        method: 'POST', headers: { authorization: 'Bearer ' + admin },
      });
      let definitivo = false;
      for (let i = 0; i < 70; i++) {
        const respuestaCierre = await cerrar();
        if (respuestaCierre.status === 200) { definitivo = true; break; }
        assert.equal(respuestaCierre.status, 202);
        await pausa(250);
      }
      assert.equal(definitivo, true);
      const rutaCierre = '/ciclos/' + cicloInicial.id + '/cierre';
      const cierre = await (await esperar('POST', rutaCierre, 200, admin)).json();
      const cierreRepetido = await (await esperar('POST', rutaCierre, 200, admin)).json();
      assert.deepEqual(cierre, cierreRepetido);
      const cuentasCerradas = await (await esperar('GET', '/?archivados=true&limite=100', 200, admin)).json();
      assert.ok(cuentasCerradas.usuarios.some(usuario => usuario.id === matriculaTardia.id));
      let resumen;
      for (let i = 0; i < 40; i++) {
        resumen = await reporte();
        if (resumen.calificados === 1) break;
        await pausa(250);
      }
      assert.deepEqual(resumen, { inscritos: 1, participantes: 1, noParticipantes: 0,
        porcentajeParticipacion: 100, enCurso: 0, finalizados: 1, calificados: 1 });
      if (process.env.VERIFICAR_REDIS === 'si') console.log('CIERRE_A_REPORTE_CONFIRMADO_MS', Date.now() - inicioFinalizacion);
    }
    const habituales = await (await esperar('GET', '/?rol=POSTULANTE&limite=100', 200, admin)).json();
    const archivados = await (await esperar('GET', '/?archivados=true&limite=100', 200, admin)).json();
    assert.ok(!habituales.usuarios.some(usuario => usuario.id === perfil.id));
    assert.ok(archivados.usuarios.some(usuario => usuario.id === perfil.id));
    await esperar('PATCH', '/' + perfil.id + '/reactivar', 409, admin);
    await esperar('POST', '/ciclos', 403, otro, { nombre: 'Ciclo', iniciaEl: '2026-01-01', terminaEl: '2026-12-31' });
    await esperar('POST', '/ciclos', 400, admin, { nombre: 'Ciclo', iniciaEl: '2026-02-30', terminaEl: '2026-12-31' });
    ciclo = await (await esperar('POST', '/ciclos', 201, admin, {
      nombre: 'Ciclo sintético', iniciaEl: '2026-01-01', terminaEl: '2026-12-31',
    })).json();
    const recuperacion = { nombre: 'Recuperado sintético', dni, sedeId: String(sede.id),
      carrera: 'INGENIERIA', cicloId: ciclo.id };
    const resultados = await Promise.all([
      enviar('POST', '/estudiantes', admin, recuperacion), enviar('POST', '/estudiantes', admin, recuperacion),
    ]);
    assert.deepEqual(resultados.map(res => res.status).sort(), [201, 409]);
    const recuperado = await resultados.find(res => res.ok).json();
    assert.equal(recuperado.id, perfil.id);
    assert.equal(recuperado.carrera, 'INGENIERIA');
    await login(correo, nueva, 401);
    assert.equal((await consultaAcademica(sesion.token)).status, 401);
    const entregaNueva = await esperar('POST', ruta, 200, admin);
    const nuevaEntrega = new ExcelJS.Workbook();
    await nuevaEntrega.xlsx.load(Buffer.from(await entregaNueva.arrayBuffer()));
    assert.equal((await login(correo, nuevaEntrega.getWorksheet(1).getCell('B2').value)).cambioPasswordRequerido, true);
    await esperar('POST', archivar, 200, admin, { ids: [perfil.id] });
  }
  const libroCarga = new ExcelJS.Workbook();
  const hojaCarga = libroCarga.addWorksheet('Datos');
  hojaCarga.addRow(['Nombre', 'DNI', 'Sede', 'Carrera']);
  const dniLote = String(randomInt(10_000_000, 100_000_000));
  hojaCarga.addRow(['Postulante sintético por lote', dniLote, sede.nombre, 'Medicina']);
  const formulario = new FormData();
  formulario.append('archivo', new Blob([await libroCarga.xlsx.writeBuffer()]), 'postulantes.xlsx');
  async function subir(libroExcel, cicloId) {
    const datos = new FormData();
    datos.append('archivo', new Blob([await libroExcel.xlsx.writeBuffer()]), 'postulantes.xlsx');
    const respuesta = await fetch(api + '/cargas-masivas' + (cicloId ? '?cicloId=' + cicloId : ''), {
      method: 'POST', headers: { authorization: 'Bearer ' + admin }, body: datos, redirect: 'error',
    });
    assert.equal(respuesta.status, 202);
    const ruta = '/cargas-masivas/' + (await respuesta.json()).id;
    let resumen;
    for (let i = 0; i < 40; i++) {
      resumen = await (await esperar('GET', ruta, 200, admin)).json();
      if (resumen.estado === 'COMPLETADA') break;
      await pausa(250);
    }
    assert.equal(resumen.estado, 'COMPLETADA');
    return { ruta, resumen };
  }
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
  const historialCargas = await (await esperar('GET', '/cargas-masivas?limite=1', 200, admin)).json();
  assert.equal(historialCargas.pagina, 1);
  assert.equal(historialCargas.cargas[0].id, resumen.id);
  assert.equal(historialCargas.cargas[0].propia, true);
  const cargasOtraSede = await (await esperar('GET', '/cargas-masivas', 200, otro)).json();
  assert.ok(!cargasOtraSede.cargas.some(carga => carga.id === resumen.id));
  await esperar('GET', '/cargas-masivas?limite=101', 400, admin);
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
  if (ciclo) {
    const recuperacion = new ExcelJS.Workbook();
    const filas = recuperacion.addWorksheet('Datos');
    filas.addRow(['Nombre', 'DNI', 'Sede', 'Carrera']);
    filas.addRow(['Recuperación desde Excel', dni, sede.nombre, 'Medicina']);
    assert.equal((await subir(recuperacion)).resumen.yaExistian, 1);
    const cicloPosterior = await (await esperar('POST', '/ciclos', 201, admin, {
      nombre: 'Otro ciclo sintético', iniciaEl: '2027-01-01', terminaEl: '2027-12-31',
    })).json();
    const loteConCiclo = await subir(recuperacion, cicloPosterior.id);
    assert.equal(loteConCiclo.resumen.recuperadas, 1);
    assert.equal(loteConCiclo.resumen.creadas, 0);
    const archivo = await esperar('POST', loteConCiclo.ruta + '/credenciales', 200, admin);
    const historial = new ExcelJS.Workbook();
    await historial.xlsx.load(Buffer.from(await archivo.arrayBuffer()));
    assert.equal(historial.getWorksheet(1).getCell('A2').value, correo);
    const nuevos = new ExcelJS.Workbook();
    const filasNuevas = nuevos.addWorksheet('Datos');
    filasNuevas.addRow(['Nombre', 'DNI', 'Sede', 'Carrera']);
    filasNuevas.addRow(['Postulante activo', dni, sede.nombre, 'Medicina']);
    assert.equal((await subir(nuevos, ciclo.id)).resumen.yaExistian, 1);
  }
  console.log('Credencial provisional, alcance, descarga concurrente y rotación de sesión verificados.');
}
verificar().catch(error => {
  console.error(error.name, error.message);
  process.exitCode = 1;
});
