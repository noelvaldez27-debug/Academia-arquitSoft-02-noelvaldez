const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { randomInt, randomUUID } = require('node:crypto');
const { setTimeout: esperar } = require('node:timers/promises');
const { rutasOpenApiBanco } = require(require('node:path').resolve('dist/modules/banco-preguntas'));

const base = 'http://127.0.0.1:3000';
const banco = '/api/banco-preguntas';
const usuarios = '/api/usuarios';

async function http(ruta, metodo, esperado, token, datos) {
  const headers = {};
  if (token) headers.authorization = 'Bearer ' + token;
  if (datos && !(datos instanceof FormData)) headers['content-type'] = 'application/json';
  const respuesta = await fetch(base + ruta, {
    method: metodo, headers, body: datos instanceof FormData ? datos : datos && JSON.stringify(datos),
  });
  if (respuesta.status !== esperado) {
    assert.fail(metodo + ' ' + ruta + ' devolvió ' + respuesta.status + '; se esperaba ' + esperado);
  }
  return respuesta;
}

function pdfSintetico() {
  const stream = 'BT /F1 18 Tf 30 100 Td (La suma de dos y dos es cuatro.) Tj ET';
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream',
  ];
  let resultado = '%PDF-1.4\n';
  const posiciones = objetos.map((objeto, indice) => {
    const posicion = resultado.length;
    resultado += (indice + 1) + ' 0 obj\n' + objeto + '\nendobj\n';
    return posicion;
  });
  const xref = resultado.length;
  resultado += 'xref\n0 6\n0000000000 65535 f \n';
  for (const posicion of posiciones) resultado += String(posicion).padStart(10, '0') + ' 00000 n \n';
  return Buffer.from(resultado + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
}

async function ejecutar() {
  const reutilizar = process.env.REUTILIZAR_ADMIN_SINTETICO === 'si';
  const password = reutilizar ? process.env.ADMIN_GENERAL_PASSWORD : randomUUID();
  const correo = reutilizar ? process.env.ADMIN_GENERAL_CORREO : 'admin-banco@prueba.invalid';
  if (!reutilizar) execFileSync(process.execPath, ['dist/scripts/migrar.js'], { stdio: 'inherit' });
  if (!reutilizar) execFileSync(process.execPath, ['dist/scripts/seed-admin.js'], { env: {
    ...process.env, ADMIN_GENERAL_NOMBRE: 'Administrador Banco',
    ADMIN_GENERAL_CORREO: correo, ADMIN_GENERAL_PASSWORD: password,
  } });
  const login = async (correo, password) =>
    (await (await http(usuarios + '/login', 'POST', 200, null, { correo, password })).json()).token;
  const admin = await login(correo, password);
  async function registrarDocente(nombre) {
    const dni = String(randomInt(10_000_000, 100_000_000));
    const perfil = await (await http(usuarios + '/docentes', 'POST', 201, admin, { nombre, dni })).json();
    return { id: perfil.id, token: await login(perfil.correo, dni) };
  }
  const { id: docenteId, token: docente } = await registrarDocente('Docente sintético de Banco');
  const { token: otro } = await registrarDocente('Otro docente sintético de Banco');
  const nombreCurso = 'Matemática sintética ' + randomUUID();
  const curso = await (await http(banco + '/cursos', 'POST', 201, admin, { nombre: nombreCurso })).json();
  const catalogo = await (await http(banco + '/cursos?q=' + encodeURIComponent(nombreCurso), 'GET', 200, docente)).json();
  assert.equal(catalogo.datos[0].id, curso.id);
  const rutaAsignaciones = banco + '/cursos/' + curso.id + '/docentes';
  await http(rutaAsignaciones + '/' + docenteId, 'PUT', 200, admin);
  assert.deepEqual((await (await http(rutaAsignaciones, 'GET', 200, admin)).json()).datos, [{ id: docenteId }]);
  await http(rutaAsignaciones, 'GET', 403, docente);
  await http(banco + '/simulacros', 'GET', 403, docente);
  await http(banco + '/cursos', 'POST', 403, docente, { nombre: 'Curso' });
  const contenido = { enunciado: '¿Cuánto es dos más dos?', correcta: 'A',
    alternativas: { A: 'Cuatro', B: 'Cinco', C: 'Seis', D: 'Siete', E: 'Ocho' } };
  const manual = await (await http(banco + '/cursos/' + curso.id + '/preguntas', 'POST', 201, admin, contenido)).json();
  await http(banco + '/preguntas/' + manual.id, 'PUT', 200, admin, contenido);

  const pdf = pdfSintetico();
  const formato = new FormData();
  formato.append('archivo', new Blob([pdf]), 'separata.pdf');
  const subida = await (await http(banco + '/cursos/' + curso.id + '/separatas', 'POST', 202, docente, formato)).json();
  const historial = banco + '/separatas?cursoId=' + curso.id;
  for (const token of [admin, docente]) {
    const pagina = await (await http(historial + '&limite=1', 'GET', 200, token)).json();
    assert.equal(pagina.datos[0].id, subida.id);
    assert.equal(pagina.hayMas, false);
  }
  assert.deepEqual((await (await http(historial, 'GET', 200, otro)).json()).datos, []);
  const ruta = banco + '/separatas/' + subida.id;
  const esperarEstado = async (estado, motivo) => {
    for (let intento = 0; intento < 40; intento++) {
      const dato = await (await http(ruta, 'GET', 200, docente)).json();
      if (dato.estado === estado && (!motivo || motivo.test(dato.motivo))) return dato;
      if (dato.estado === 'ERROR_EXTRACCION') assert.fail(dato.motivo);
      await esperar(500);
    }
    assert.fail('No se alcanzó el estado ' + estado);
  };
  await esperarEstado('TEXTO_EXTRAIDO', /autorización/);
  await http(ruta, 'GET', 403, otro);
  const original = await http(ruta + '/archivo', 'GET', 200, admin);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), pdf);
  const permiso = { estado: 'AUTORIZADA', alcance: ['texto'], contenidoApto: true };
  await http(ruta + '/autorizacion', 'PUT', 403, docente, permiso);
  await http(ruta + '/autorizacion', 'PUT', 200, admin, permiso);
  const { propuestas } = await esperarEstado('PREGUNTAS_PROPUESTAS');
  assert.equal(propuestas.length, 1);
  assert.match(propuestas[0].enunciado, /La suma de dos/);
  const propuesta = banco + '/propuestas/' + propuestas[0].id;
  await http(propuesta + '/aprobar', 'POST', 403, admin);
  await http(propuesta + '/aprobar', 'POST', 200, docente);

  const listar = async () => (await http(banco + '/cursos/' + curso.id + '/preguntas', 'GET', 200, admin)).json();
  const extraida = (await listar()).find(pregunta => pregunta.propuestaId === propuestas[0].id);
  assert.equal(extraida.habilitada, true);
  const configuracion = { duracionMinutos: 35, preguntas: [extraida.id, manual.id] };
  const simulacro = await (await http(banco + '/simulacros', 'POST', 201, admin, configuracion)).json();
  const simulacros = await (await http(banco + '/simulacros?q=' + simulacro.id, 'GET', 200, admin)).json();
  assert.deepEqual(simulacros.datos[0], { id: simulacro.id, ...configuracion });
  const rutaSimulacro = banco + '/simulacros/' + simulacro.id;
  await http(rutaSimulacro, 'PUT', 200, admin, configuracion);
  const visible = await (await http(rutaSimulacro, 'GET', 200, admin)).json();
  assert.deepEqual(visible.preguntas.map(pregunta => pregunta.id), configuracion.preguntas);
  assert.ok(visible.preguntas.every(pregunta => !('correcta' in pregunta)));
  await http(propuesta, 'PUT', 200, admin, contenido);
  await http(rutaSimulacro, 'GET', 409, admin);
  await http(propuesta + '/aprobar', 'POST', 200, docente);
  await http(rutaSimulacro, 'GET', 200, admin);

  const imagen = new FormData();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XJ1sAAAAASUVORK5CYII=', 'base64');
  imagen.append('archivo', new Blob([png]), 'separata.png');
  const imagenSubida = await (await http(banco + '/cursos/' + curso.id + '/separatas', 'POST', 202, docente, imagen)).json();
  const rutaImagen = banco + '/separatas/' + imagenSubida.id;
  await http(rutaImagen + '/autorizacion', 'PUT', 200, admin, {
    estado: 'AUTORIZADA', alcance: ['texto', 'adjunto'], contenidoApto: true,
  });
  let imagenProcesada;
  for (let intento = 0; intento < 40; intento++) {
    imagenProcesada = await (await http(rutaImagen, 'GET', 200, docente)).json();
    if (imagenProcesada.estado === 'PREGUNTAS_PROPUESTAS') break;
    assert.notEqual(imagenProcesada.estado, 'ERROR_EXTRACCION');
    await esperar(500);
  }
  assert.equal(imagenProcesada.estado, 'PREGUNTAS_PROPUESTAS');
  await http(banco + '/propuestas/' + imagenProcesada.propuestas[0].id + '/descartar', 'POST', 200, admin);

  const swagger = await (await http('/api-docs/swagger-ui-init.js', 'GET', 200)).text();
  for (const [rutaOpenApi, operaciones] of Object.entries(rutasOpenApiBanco)) {
    assert.ok(swagger.includes(rutaOpenApi));
    for (const metodo of Object.keys(operaciones)) {
      await http(rutaOpenApi.replace(/\{[^}]+\}/g, 'identificador'), metodo.toUpperCase(), 401);
    }
  }

  console.log('Banco de Preguntas validado con PostgreSQL, RabbitMQ, extracción PDF y lectura de imagen con IA simulada y OpenAPI.');
}

ejecutar().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
