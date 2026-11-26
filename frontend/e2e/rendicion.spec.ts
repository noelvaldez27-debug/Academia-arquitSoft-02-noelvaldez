import { expect, test } from '@playwright/test';

const base = '/api/v1/examenes';
const ahora = new Date('2026-11-26T12:00:00Z');
const intento = {
  id: 'intento', simulacroId: 'simulacro', inicio: ahora.toISOString(),
  vence: new Date(ahora.getTime() + 60_000).toISOString(), cierre: null,
  estado: 'ACTIVO', tiempoRestanteMs: 60000, respuestas: [],
  preguntas: [
    { id: 'p1', enunciado: 'Pregunta sintética uno', alternativas: { A: 'Uno', B: 'Dos', C: 'Tres', D: 'Cuatro', E: 'Cinco' } },
    { id: 'p2', enunciado: 'Pregunta sintética dos', alternativas: { A: 'Uno', B: 'Dos', C: 'Tres', D: 'Cuatro', E: 'Cinco' } },
  ],
};

test('inicia una vez y reanuda el intento propio en ficha impresa', async ({ page }) => {
  let iniciados = 0;
  let recuperados = 0;
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })).toString('base64url') + '.firma';
  await page.route('**/api/**', async route => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith('/login')) return route.fulfill({ json: { token, usuario: {
      id: 'demo', nombre: 'Postulante sintético', rol: 'POSTULANTE', sedeId: '1' } } });
    if (ruta === base + '/simulacros') return route.fulfill({ json: [{
      simulacroId: 'simulacro', intentoId: iniciados ? 'intento' : null, habilitadoEn: null, estado: iniciados ? 'EN_CURSO' : 'DISPONIBLE',
    }] });
    if (ruta === base + '/iniciar') {
      expect(route.request().postDataJSON()).toEqual({ simulacroId: 'simulacro' });
      iniciados++;
      return route.fulfill({ json: intento });
    }
    if (ruta === base + '/intento') {
      recuperados++;
      return route.fulfill({ json: { ...intento, tiempoRestanteMs: 25000, respuestas: [{ numero: 1, alternativa: 'C', revision: 1 }] } });
    }
    return route.fulfill({ status: 404 });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('postulante@example.test');
  await page.getByLabel('Contraseña').fill('clave de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Simulacros' }).click();
  await page.getByRole('button', { name: 'Ver instrucciones' }).click();
  await page.getByRole('button', { name: 'Comenzar simulacro' }).click();
  await expect(page.getByText('Pregunta sintética uno')).toBeVisible();
  await page.getByRole('button', { name: 'Pregunta siguiente' }).click();
  await expect(page.getByText('Pregunta sintética dos')).toBeVisible();
  await page.getByRole('button', { name: 'Volver a simulacros' }).click();
  await page.getByRole('button', { name: 'Reanudar intento' }).click();
  await page.getByRole('radio', { name: 'Ficha impresa' }).check();
  await page.getByRole('button', { name: 'Abrir intento' }).click();
  await expect(page.getByRole('radio', { name: 'C', exact: true })).toBeChecked();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByText('Pregunta sintética uno')).toHaveCount(0);
  expect(iniciados).toBe(1);
  expect(recuperados).toBeGreaterThanOrEqual(1);
});
