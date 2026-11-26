const assert = require('node:assert/strict');
const { randomInt, randomUUID } = require('node:crypto');
const { mkdirSync } = require('node:fs');
const { setTimeout: esperar } = require('node:timers/promises');
const Excel = require('exceljs');
const { chromium } = require('../frontend/node_modules/playwright');

const base = new URL(process.env.EVALUA_RENDICION_URL ?? 'http://127.0.0.1:18080');
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'El recorrido solo se ejecuta en Compose local.');
const usuarios = '/api/usuarios';
const banco = '/api/banco-preguntas';
const rendicion = '/api/v1/examenes';

async function solicitar(ruta, metodo, esperado, token, datos) {
  const respuesta = await fetch(new URL(ruta, base), {
    method: metodo,
    headers: { ...(token && { authorization: 'Bearer ' + token }), ...(datos && { 'content-type': 'application/json' }) },
    body: datos && JSON.stringify(datos),
  });
  assert.ok([esperado].flat().includes(respuesta.status), metodo + ' ' + ruta + ': HTTP ' + respuesta.status);
  return respuesta;
}
const json = async (...args) => (await solicitar(...args)).json();
const login = (correo, password) => json(usuarios + '/login', 'POST', 200, undefined, { correo, password });

async function crearPostulante(token, sedeId, cicloId) {
  const dni = String(randomInt(10_000_000, 100_000_000));
  const perfil = await json(usuarios + '/estudiantes', 'POST', 201, token,
    { dni, nombre: 'Postulante sintético de Rendición', carrera: 'Ingeniería', sedeId, ...(cicloId && { cicloId }) });
  const archivo = await solicitar(usuarios + '/estudiantes/' + perfil.id + '/credenciales', 'POST', 200, token);
  const libro = new Excel.Workbook();
  await libro.xlsx.load(Buffer.from(await archivo.arrayBuffer()));
  const passwordActual = libro.getWorksheet(1).getCell('B2').value;
  const password = randomUUID();
  const temporal = await login(perfil.correo, passwordActual);
  await solicitar(usuarios + '/password', 'PATCH', 200, temporal.token, { passwordActual, passwordNueva: password });
  return { correo: perfil.correo, password, token: (await login(perfil.correo, password)).token };
}

async function ejecutar() {
  const administrador = await login(process.env.EVALUA_ADMIN_SINTETICO_CORREO, process.env.EVALUA_ADMIN_SINTETICO_PASSWORD);
  const admin = administrador.token;
  const [sede] = await json(usuarios + '/sedes', 'GET', 200, admin);
  const ciclo = await json(usuarios + '/ciclos', 'POST', 201, admin, {
    nombre: 'Ciclo sintético ' + randomUUID(), iniciaEl: '2026-01-01', terminaEl: '2090-12-31',
  });
  const [propio, externo] = await Promise.all([
    crearPostulante(admin, sede.id, ciclo.id), crearPostulante(admin, sede.id),
  ]);
  const curso = await json(banco + '/cursos', 'POST', 201, admin, { nombre: 'Rendición sintética ' + randomUUID() });
  const pregunta = await json(banco + '/cursos/' + curso.id + '/preguntas', 'POST', 201, admin, {
    enunciado: 'Pregunta sintética de Rendición', alternativas: { A: 'Uno', B: 'Dos', C: 'Tres', D: 'Cuatro', E: 'Cinco' }, correcta: 'A',
  });
  const sim = await json(banco + '/simulacros', 'POST', 201, admin, { duracionMinutos: 15, preguntas: [pregunta.id] });
  const listado = token => json(rendicion + '/simulacros', 'GET', 200, token);
  assert.ok(!(await listado(propio.token)).some(s => s.simulacroId === sim.id));
  await solicitar(rendicion + '/simulacros/' + sim.id + '/habilitar', 'POST', 200, admin, { cicloId: ciclo.id });
  assert.ok(!(await listado(externo.token)).some(s => s.simulacroId === sim.id));
  await solicitar(rendicion + '/iniciar', 'POST', 409, externo.token, { simulacroId: sim.id });
  assert.equal((await listado(propio.token)).find(s => s.simulacroId === sim.id)?.estado, 'DISPONIBLE');
  await solicitar(rendicion + '/simulacros', 'GET', 403, admin);

  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  try {
    const contexto = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    let pagina = await contexto.newPage();
    await pagina.goto(new URL('/acceso', base).href);
    await pagina.getByLabel('Correo institucional').fill(propio.correo);
    await pagina.getByLabel('Contraseña').fill(propio.password);
    await pagina.getByRole('button', { name: 'Ingresar' }).click();
    await pagina.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Simulacros' }).click();
    await pagina.getByRole('listitem').filter({ hasText: sim.id }).getByRole('button', { name: 'Ver instrucciones' }).click();
    await pagina.getByRole('button', { name: 'Comenzar simulacro' }).click();
    await pagina.getByRole('radio', { name: 'A · Uno' }).waitFor();
    const referencia = (await listado(propio.token)).find(s => s.simulacroId === sim.id);
    assert.equal(referencia.estado, 'EN_CURSO');
    const ruta = rendicion + '/' + referencia.intentoId;
    await solicitar(ruta, 'GET', 404, externo.token);
    const instantanea = await json(ruta, 'GET', 200, propio.token);
    assert.ok(instantanea.preguntas.every(p => !Object.hasOwn(p, 'correcta')));
    await contexto.setOffline(true);
    await pagina.getByRole('radio', { name: 'A · Uno' }).click();
    await pagina.getByText(/1 operaciones pendientes/).waitFor();
    await pagina.getByRole('radio', { name: 'B · Dos' }).click();
    await pagina.getByText(/2 operaciones pendientes/).waitFor();
    assert.deepEqual((await json(ruta, 'GET', 200, propio.token)).respuestas, []);
    mkdirSync('frontend/evidencias-locales', { recursive: true });
    await pagina.screenshot({ path: 'frontend/evidencias-locales/rendicion-compose.png', fullPage: true });
    await pagina.close();
    await contexto.setOffline(false);
    pagina = await contexto.newPage();
    await pagina.goto(new URL('/acceso', base).href);
    await pagina.getByLabel('Correo institucional').fill(propio.correo);
    await pagina.getByLabel('Contraseña').fill(propio.password);
    await pagina.getByRole('button', { name: 'Ingresar' }).click();
    await pagina.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Simulacros' }).click();
    await pagina.getByRole('listitem').filter({ hasText: sim.id }).getByRole('button', { name: 'Reanudar intento' }).click();
    await pagina.getByRole('button', { name: 'Abrir intento' }).click();
    await pagina.getByRole('radio', { name: 'B · Dos' }).waitFor();
    await pagina.waitForFunction(() => Array.from(document.querySelectorAll('input[name="respuesta"]')).some(
      radio => radio.checked && radio.closest('label')?.textContent.includes('B · Dos'),
    ));
    await pagina.getByText(/0 operaciones pendientes/).waitFor();
    assert.deepEqual((await json(ruta, 'GET', 200, propio.token)).respuestas, [{ numero: 1, alternativa: 'B', revision: 2 }]);
    const repetido = await json(rendicion + '/iniciar', 'POST', 200, propio.token, { simulacroId: sim.id });
    assert.equal(repetido.id, referencia.intentoId);
    pagina.once('dialog', dialogo => dialogo.accept());
    const inicioCierre = performance.now();
    await pagina.getByRole('button', { name: 'Finalizar intento' }).click();
    await pagina.getByRole('link', { name: 'Ir a Mi nota' }).waitFor();
    const cerrado = await json(ruta, 'GET', 200, propio.token);
    assert.equal(cerrado.estado, 'FINALIZADO');
    assert.deepEqual(cerrado.respuestas, repetido.respuestas);
    await solicitar(ruta + '/respuestas', 'PUT', 409, propio.token,
      { numero: 1, alternativa: 'C', revisionBase: 2, operacionId: randomUUID() });
    console.log('Rendición web verificada con nginx, API real, padrón, IndexedDB, reconexión, Redis y cierre PostgreSQL.');
    if (process.env.EVALUA_VERIFICAR_NOTA === 'si') {
      const resultado = '/api/v1/resultados/' + referencia.intentoId;
      await pagina.getByRole('link', { name: 'Ir a Mi nota' }).click();
      await pagina.getByRole('heading', { name: 'Calificación definitiva' }).waitFor();
      const tiempoVisible = Math.round(performance.now() - inicioCierre);
      await pagina.getByText(/^0\.00\s+\/ 1000 puntos$/).waitFor();
      await pagina.locator('time').waitFor();
      assert.equal(await pagina.locator('time').getAttribute('datetime'), cerrado.inicio);
      const nota = await json(resultado, 'GET', 200, propio.token);
      assert.equal(nota.puntaje, 0);
      assert.equal(nota.simulacroId, sim.id);
      assert.deepEqual([nota.correctas, nota.incorrectas, nota.omitidas], [0, 1, 0]);
      assert.equal(nota.porCurso.length, 1);
      const desglose = pagina.getByRole('table', { name: 'Resultados por curso' });
      assert.deepEqual(await desglose.getByRole('cell').allTextContents(), ['0', '1', '0']);
      await solicitar(resultado, 'GET', 404, externo.token);
      await solicitar(resultado, 'GET', 403, admin);
      await pagina.screenshot({ path: 'frontend/evidencias-locales/mi-nota-compose.png', fullPage: true });
      console.log('Mi nota verificada con nginx, API, RabbitMQ y worker real. Cierre a nota visible: ' + tiempoVisible + ' ms.');
    }
    if (process.env.EVALUA_VERIFICAR_RANKING === 'si') {
      const ranking = '/api/v1/rankings/' + sim.id;
      const posicion = async definitiva => {
        for (let i = 0; i < 80; i++) {
          const respuesta = await fetch(new URL(ranking + '/propio', base), {
            headers: { authorization: 'Bearer ' + propio.token },
          });
          if (respuesta.ok) {
            const datos = await respuesta.json();
            if (datos.definitiva === definitiva && datos.general.puesto === 1) return datos;
          } else assert.ok([404, 503].includes(respuesta.status));
          await esperar(250);
        }
        assert.fail('No se publicó la posición esperada.');
      };
      const provisional = await posicion(false);
      assert.equal(provisional.puntaje, 0);
      assert.equal(provisional.carrera.puesto, 1);
      assert.equal(provisional.sede.puesto, 1);
      assert.equal(Object.hasOwn(provisional, 'filas'), false);
      await solicitar(ranking, 'GET', 403, propio.token);
      await solicitar(ranking + '/propio', 'GET', 404, externo.token);
      await pagina.getByRole('navigation').getByRole('link', { name: 'Mi posición' }).click();
      const simulacroPropio = pagina.locator('select[name="simulacro-propio"]');
      await simulacroPropio.selectOption(sim.id, { timeout: 10000 });
      await pagina.getByText('Publicación provisional', { exact: true }).waitFor();
      await pagina.getByText('Puesto 1', { exact: true }).first().waitFor();
      await solicitar(rendicion + '/simulacros/' + sim.id + '/cierre', 'POST', [200, 202], admin);
      await posicion(true);
      await simulacroPropio.selectOption('');
      await simulacroPropio.selectOption(sim.id);
      await pagina.getByText('Publicación definitiva', { exact: true }).waitFor();
      await pagina.screenshot({ path: 'frontend/evidencias-locales/mi-posicion-compose.png', fullPage: true });

      const gestor = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await gestor.goto(new URL('/acceso', base).href);
      await gestor.getByLabel('Correo institucional').fill(process.env.EVALUA_ADMIN_SINTETICO_CORREO);
      await gestor.getByLabel('Contraseña').fill(process.env.EVALUA_ADMIN_SINTETICO_PASSWORD);
      await gestor.getByRole('button', { name: 'Ingresar' }).click();
      await gestor.getByRole('navigation').getByRole('link', { name: 'Reportes' }).click();
      const selector = gestor.locator('select[name="simulacro-admin"]');
      for (let i = 0; i < 20; i++) {
        await selector.waitFor();
        if (await selector.locator('option').evaluateAll((items, id) => items.some(item => item.value === id), sim.id)) break;
        const siguiente = gestor.getByRole('button', { name: 'Siguiente' }).first();
        await siguiente.click();
      }
      await selector.selectOption(sim.id);
      await gestor.getByRole('table', { name: 'Posiciones' }).waitFor();
      await gestor.getByRole('button', { name: 'Participación', exact: true }).click();
      const informe = gestor.getByRole('region', { name: 'Informe del simulacro' });
      await informe.getByText('Inscritos en el padrón').waitFor();
      const resumen = (await json(ranking + '/reportes/participacion', 'GET', 200, admin)).resumen;
      assert.equal(resumen.inscritos, 1);
      assert.equal(resumen.participantes, 1);
      assert.equal(resumen.porcentajeParticipacion, 100);
      await informe.getByText('100 %', { exact: true }).waitFor();
      await gestor.screenshot({ path: 'frontend/evidencias-locales/participacion-compose.png', fullPage: true });
      await gestor.getByRole('button', { name: 'Cuadro de mérito', exact: true }).click();
      await gestor.getByRole('table', { name: 'Cuadro de mérito' }).waitFor();
      const evento = gestor.waitForEvent('download');
      await gestor.getByRole('button', { name: 'Exportar Excel' }).click();
      const archivo = await evento;
      assert.equal(archivo.suggestedFilename(), 'meritos.xlsx');
      const libro = new Excel.Workbook();
      await libro.xlsx.readFile(await archivo.path());
      assert.ok(libro.worksheets[0].rowCount >= 2);
      await gestor.close();
      console.log('Ranking web verificado con publicación provisional y definitiva, privacidad, padrón real y Excel legible.');
    }
  } finally { await browser.close(); }
}

ejecutar().catch(error => { console.error(error.message); process.exitCode = 1; });
