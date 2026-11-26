import { expect, test } from '@playwright/test';

test('protege rutas, muestra el panel del rol y deja una captura local', async ({ page }, info) => {
  const exp = Math.floor(Date.now() / 1000) + 60;
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp })).toString('base64url') + '.firma';
  await page.route('**/api/usuarios/login', route => route.fulfill({ json: {
    token,
    usuario: { id: '1', nombre: 'Docente de ejemplo', correo: 'docente@example.test', rol: 'DOCENTE', sedeId: null },
  } }));
  await page.goto('/panel/general/usuarios');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('acceso.png'), fullPage: true });
  await page.getByLabel('Correo institucional').fill('docente@example.test');
  await page.getByLabel('Contraseña').fill('clave local de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/panel\/docente$/);
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Separatas' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Usuarios' })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('panel.png'), fullPage: true });
  await page.getByRole('navigation').getByRole('link', { name: 'Separatas' }).click();
  await expect(page.getByRole('heading', { name: 'Separatas', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

test('ofrece un error recuperable si la API falla', async ({ page }) => {
  await page.route('**/api/usuarios/login', route => route.fulfill({ status: 503 }));
  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('docente@example.test');
  await page.getByLabel('Contraseña').fill('clave local de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('alert')).toContainText('servicio no está disponible');
});
