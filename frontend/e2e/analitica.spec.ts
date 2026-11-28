import { expect, test } from '@playwright/test';

test('compara resultados por tabla y solicita el refuerzo explícitamente', async ({ page }) => {
  let recomendaciones = 0;
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })).toString('base64url') + '.firma';
  await page.route('**/api/usuarios/login', ruta => ruta.fulfill({ json: {
    token, usuario: { id: 'demo', nombre: 'Postulante sintético', rol: 'POSTULANTE', sedeId: '1' },
  } }));
  await page.route('**/api/v1/analitica/mi-historial', ruta => ruta.fulfill({ json: {
    historial: [
      { simulacroId: 'SIM-01', fecha: '2026-11-24T14:00:00Z', puntaje: 0, correctas: 0, incorrectas: 2, omitidas: 3 },
      { simulacroId: 'SIM-02', fecha: '2026-11-25T14:00:00Z', puntaje: 400, correctas: 2, incorrectas: 1, omitidas: 2 },
    ],
    porCurso: [{ cursoId: 'MAT', total: 10, desempeno: 20, correctas: 2, incorrectas: 3, omitidas: 5 }],
  } }));
  await page.route('**/api/v1/analitica/mi-recomendacion', ruta => {
    recomendaciones++;
    expect(ruta.request().method()).toBe('POST');
    return ruta.fulfill({ json: { estado: 'vigente', origen: 'local', contenido: 'Repasa los ejercicios de práctica.' } });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('postulante@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave local de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  const nav = page.getByRole('navigation');
  await nav.getByRole('link', { name: 'Mi historial' }).click();
  const tabla = page.getByRole('table', { name: 'Comparación de simulacros y distribución de respuestas' });
  await expect(tabla.getByRole('rowheader', { name: 'SIM-01' })).toBeVisible();
  await expect(tabla.getByRole('rowheader', { name: 'SIM-02' })).toBeVisible();
  await expect(tabla.getByText('400.00', { exact: true })).toBeVisible();
  const region = page.getByRole('region', { name: 'Tabla desplazable de simulacros' });
  await region.focus();
  await expect(region).toBeFocused();
  await expect(page.getByRole('table', { name: 'Porcentajes y conteos por curso' })).toContainText('20.00 %');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const enlace = nav.getByRole('link', { name: 'Recomendación' });
  await enlace.focus();
  await enlace.press('Enter');
  const boton = page.getByRole('button', { name: 'Consultar recomendación' });
  await expect(boton).toBeVisible();
  expect(recomendaciones).toBe(0);
  await boton.focus();
  await boton.press('Enter');
  await expect(page.getByText('Origen: recomendación local')).toBeVisible();
  expect(recomendaciones).toBe(1);
});
