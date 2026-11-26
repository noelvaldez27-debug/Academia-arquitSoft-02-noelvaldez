const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { createRequire } = require('node:module');
const { setTimeout: esperar } = require('node:timers/promises');
const base = 'http://127.0.0.1:3000/api';

function percentiles(muestras) {
  const valores = muestras.slice().sort((a, b) => a - b);
  const p = n => +valores[Math.ceil(n * valores.length) - 1].toFixed(2);
  return { n: valores.length, p50: p(0.5), p95: p(0.95), max: p(1) };
}

function medirCostoBcryptAislado() {
  const bcrypt = createRequire('/app/package.json')('bcryptjs');
  const secretoSintetico = 'credencial-sintetica-exclusiva-del-perfil';
  const hash = bcrypt.hashSync(secretoSintetico, 10);
  const crono = performance.now();
  const cpuInicial = process.cpuUsage();
  for (let i = 0; i < 10; i++) assert.ok(bcrypt.compareSync(secretoSintetico, hash));
  const cpu = process.cpuUsage(cpuInicial);
  return { comparaciones: 10, rondas: 10, paredMs: +(performance.now() - crono).toFixed(2),
    cpuMs: +((cpu.user + cpu.system) / 1000).toFixed(2) };
}

async function ejecutar(cuentas) {
  assert.equal(cuentas.length, 10);
  let disponible = false;
  for (let i = 0; i < 40 && !disponible; i++) {
    disponible = await fetch('http://127.0.0.1:3000/health').then(res => res.ok, () => false);
    if (!disponible) await esperar(250);
  }
  assert.ok(disponible, 'La API local no responde.');
  async function autenticar(cuenta) {
    const inicio = performance.now();
    const login = await fetch(base + '/usuarios/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuenta), redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    assert.equal(login.status, 200);
    const { token, cambioPasswordRequerido } = await login.json();
    assert.ok(token && !cambioPasswordRequerido);
    const loginMs = performance.now() - inicio;
    const protegido = performance.now();
    const consulta = await fetch(base + '/v1/analitica/mi-historial', {
      headers: { authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    assert.equal(consulta.status, 200);
    await consulta.arrayBuffer();
    return { loginMs, protegidoMs: performance.now() - protegido };
  }
  await autenticar(cuentas[0]);
  await autenticar(cuentas[1]);
  const inicio = new Date().toISOString();
  const serie = [];
  for (const cuenta of cuentas) serie.push(await autenticar(cuenta));
  const paralelo = await Promise.all(cuentas.map(autenticar));
  const resumir = filas => ({
    loginMs: percentiles(filas.map(f => f.loginMs)),
    protegidoMs: percentiles(filas.map(f => f.protegidoMs)),
  });
  console.log(JSON.stringify({ inicio, fin: new Date().toISOString(), serie: resumir(serie),
    paralelo: resumir(paralelo), muestrasSerie: serie, muestrasParalelo: paralelo, comprobaciones: 40 }));
}
