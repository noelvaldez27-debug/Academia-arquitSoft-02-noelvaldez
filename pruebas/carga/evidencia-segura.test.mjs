import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contieneCredenciales, exportarResumen } from './evidencia-segura.mjs';

test('el resumen conserva métricas y comprobaciones y omite los datos de setup', () => {
  const metrics = { latencia: { values: { 'p(95)': 42 } } };
  const root_group = { checks: [{ name: 'conciliación', passes: 3, fails: 0 }] };
  const state = { testRunDurationMs: 123 };
  const options = { summaryTrendStats: ['p(95)'] };
  const salida = exportarResumen({ metrics, root_group, state, options, setup_data: { token: 'simulado' } });
  assert.deepEqual(JSON.parse(salida['/evidencia/resumen.json']), { metrics, root_group, state, options });
});

test('detecta credenciales sintéticas sin exponerlas en errores', () => {
  for (const muestra of [
    'eyJhbGciOiJIUzI1NiJ9.simulado.firma-invalida',
    'Authorization: Bearer ensayo-sintetico',
    '{"password":"valor-sintetico"}',
    'ADMIN_SINTETICO_SECRET=valor-sintetico',
    'postgres://prueba:valor-sintetico@localhost',
  ]) {
    assert.ok(contieneCredenciales(muestra));
    assert.throws(() => exportarResumen({ metrics: { muestra } }), /posible dato de autenticación/);
  }
  assert.equal(contieneCredenciales('k6_exit=99; p(95)=2000; Authorization'), false);
});
