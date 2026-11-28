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
  await page.getByLabel('Contraseña', { exact: true }).fill('clave de prueba');
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

test('guarda cambios sin conexión, reenvía el mismo ID tras perder la confirmación y finaliza', async ({ page, context }, info) => {
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })).toString('base64url') + '.firma';
  const cambios: { numero: number; alternativa: string | null; revisionBase: number; operacionId: string }[] = [];
  let confirmado: { numero: number; alternativa: string | null; revision: number } | undefined;
  let cerrado = false;
  const registrados = new Map<string, typeof confirmado>();
  await page.route('**/api/**', route => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith('/login')) return route.fulfill({ json: { token, usuario: {
      id: 'offline', nombre: 'Postulante sintético', rol: 'POSTULANTE', sedeId: '1' } } });
    if (ruta === base + '/simulacros') return route.fulfill({ json: [
      { simulacroId: 'simulacro', intentoId: 'intento', estado: 'EN_CURSO', habilitadoEn: null },
    ] });
    if (ruta === base + '/intento/respuestas') {
      const op = route.request().postDataJSON();
      cambios.push(op);
      const previa = registrados.get(op.operacionId);
      if (previa) return route.fulfill({ json: previa });
      expect(op.revisionBase).toBe(confirmado?.revision ?? 0);
      confirmado = { numero: 1, alternativa: op.alternativa, revision: op.revisionBase + 1 };
      registrados.set(op.operacionId, confirmado);
      return cambios.length === 1 ? route.abort('failed') : route.fulfill({ json: confirmado });
    }
    if (ruta === base + '/intento/finalizar') {
      cerrado = true;
      return route.fulfill({ json: { id: 'intento', estado: 'FINALIZADO', cierre: ahora.toISOString() } });
    }
    return route.fulfill({ json: { ...intento, respuestas: confirmado ? [confirmado] : [] } });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('postulante@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Simulacros' }).click();
  await page.getByRole('button', { name: 'Reanudar intento' }).click();
  await page.getByRole('button', { name: 'Abrir intento' }).click();
  await expect(page.getByRole('radio', { name: 'A · Uno' })).toBeEnabled();
  await context.setOffline(true);
  await page.getByRole('radio', { name: 'A · Uno' }).click();
  await expect(page.getByText(/1 operaciones pendientes/)).toBeVisible();
  await page.getByRole('radio', { name: 'B · Dos' }).click();
  await expect(page.getByText(/2 operaciones pendientes/)).toBeVisible();
  await page.getByRole('button', { name: 'Quitar respuesta' }).click();
  await expect(page.getByText(/3 operaciones pendientes/)).toBeVisible();
  expect(cambios).toHaveLength(0);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Mi cuenta' }).click();
  await expect(page.getByText('Sin conexión', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('rendicion-sin-conexion.png'), fullPage: true });
  await context.setOffline(false);
  await expect(page.getByRole('alert')).toContainText('No se pudo conectar');
  await page.getByRole('button', { name: 'Actualizar y sincronizar' }).click();
  await expect(page.getByText(/0 operaciones pendientes/)).toBeVisible();
  expect(cambios.map(c => c.alternativa)).toEqual(['A', 'A', 'B', null]);
  expect(cambios[0].operacionId).toBe(cambios[1].operacionId);
  expect(confirmado).toEqual({ numero: 1, alternativa: null, revision: 3 });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Finalizar intento' }).click();
  await expect(page.getByRole('link', { name: 'Ir a Mi nota' })).toBeVisible();
  expect(cerrado).toBe(true);
});

test('bloquea marcas al vencer y espera el cierre efectivo sin enviar un cierre manual', async ({ page }) => {
  let consultas = 0;
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })).toString('base64url') + '.firma';
  await page.route('**/api/**', route => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith('/login')) return route.fulfill({ json: { token, usuario: {
      id: 'vence', nombre: 'Postulante sintético', rol: 'POSTULANTE', sedeId: '1' } } });
    if (ruta === base + '/simulacros') return route.fulfill({ json: [
      { simulacroId: 'simulacro', intentoId: 'intento', estado: 'EN_CURSO', habilitadoEn: null },
    ] });
    expect(route.request().method()).toBe('GET');
    consultas++;
    return route.fulfill({ json: { ...intento, tiempoRestanteMs: 0,
      estado: consultas > 1 ? 'FINALIZADO' : 'ACTIVO', cierre: consultas > 1 ? ahora.toISOString() : null } });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('postulante@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Simulacros' }).click();
  await page.getByRole('button', { name: 'Reanudar intento' }).click();
  await page.getByRole('button', { name: 'Abrir intento' }).click();
  await expect(page.getByRole('radio', { name: 'A · Uno' })).toBeDisabled();
  await expect(page.getByText(/servidor confirmó la finalización/)).toBeVisible();
  expect(consultas).toBeGreaterThanOrEqual(2);
});

test('una revisión ajena conserva la marca del servidor hasta que el usuario decide', async ({ page, context }) => {
  let externa = false;
  let envios = 0;
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })).toString('base64url') + '.firma';
  await page.route('**/api/**', route => {
    const ruta = new URL(route.request().url()).pathname;
    if (ruta.endsWith('/login')) return route.fulfill({ json: { token, usuario: {
      id: 'conflicto', nombre: 'Postulante sintético', rol: 'POSTULANTE', sedeId: '1' } } });
    if (ruta === base + '/simulacros') return route.fulfill({ json: [
      { simulacroId: 'simulacro', intentoId: 'intento', estado: 'EN_CURSO', habilitadoEn: null },
    ] });
    if (ruta === base + '/intento/respuestas') {
      expect(route.request().postDataJSON().revisionBase).toBe(0);
      envios++;
      return route.fulfill({ status: 409, json: { codigo: 'conflicto' } });
    }
    return route.fulfill({ json: { ...intento, respuestas: externa ? [{ numero: 1, alternativa: 'B', revision: 1 }] : [] } });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('postulante@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Simulacros' }).click();
  await page.getByRole('button', { name: 'Reanudar intento' }).click();
  await page.getByRole('button', { name: 'Abrir intento' }).click();
  await expect(page.getByRole('radio', { name: 'A · Uno' })).toBeEnabled();
  await context.setOffline(true);
  await page.getByRole('radio', { name: 'A · Uno' }).click();
  await expect(page.getByText(/1 operaciones pendientes/)).toBeVisible();
  externa = true;
  await context.setOffline(false);
  await expect(page.getByText(/revisión distinta en el servidor/)).toBeVisible();
  await page.getByRole('button', { name: 'Usar respuesta confirmada' }).click();
  await expect(page.getByRole('radio', { name: 'B · Dos' })).toBeChecked();
  await expect(page.getByText(/0 operaciones pendientes/)).toBeVisible();
  expect(envios).toBe(1);
});
