import { expect, test } from '@playwright/test';

test('el administrador de sede registra, cambia condición y archiva en su sede', async ({ page }, info) => {
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 90 })).toString('base64url') + '.firma';
  const alumno = { id: '20', nombre: 'Estudiante sintético', dni: '87654321', correo: 'cuenta@example.test',
    rol: 'POSTULANTE', activo: true, sedeId: '2', carrera: 'Ingeniería' };
  let registrado = false;
  let archivado = false;
  await page.route('**/api/usuarios**', async route => {
    const url = new URL(route.request().url());
    const recurso = url.pathname.replace('/api/usuarios', '');
    if (recurso === '/login') return route.fulfill({ json: { token, usuario: { id: '10', nombre: 'Sede sintética',
      correo: 'sede@example.test', rol: 'ADMINISTRADOR', sedeId: '2' } } });
    if (recurso === '/sedes') return route.fulfill({ json: [{ id: '2', nombre: 'Sede de prueba' }, { id: '3', nombre: 'Otra sede' }] });
    if (recurso === '/ciclos') return route.fulfill({ json: [] });
    if (recurso === '/estudiantes') {
      expect(route.request().postDataJSON()).toMatchObject({ sedeId: '2', dni: alumno.dni });
      registrado = true;
      return route.fulfill({ status: 201, json: alumno });
    }
    if (recurso.endsWith('/condicion')) {
      expect(route.request().postDataJSON()).toEqual({ condicion: 'LIBRE' });
      return route.fulfill({ status: 204 });
    }
    if (recurso === '/estudiantes/archivar') {
      expect(route.request().postDataJSON()).toEqual({ ids: [alumno.id] });
      archivado = true;
      return route.fulfill({ json: { archivados: 1 } });
    }
    expect(url.searchParams.get('rol')).toBe('POSTULANTE');
    const mostrar = registrado && (archivado === (url.searchParams.get('archivados') === 'true'));
    return route.fulfill({ json: { usuarios: mostrar ? [{ ...alumno, activo: !archivado }] : [], total: mostrar ? 1 : 0, pagina: 1, limite: 20 } });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('sede@example.test');
  await page.getByLabel('Contraseña').fill('clave de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Estudiantes' }).click();
  await expect(page.getByLabel('Tipo de usuario')).toHaveCount(0);
  await page.getByLabel('Nombre', { exact: true }).fill(alumno.nombre);
  await page.getByLabel('DNI', { exact: true }).fill(alumno.dni);
  await page.getByLabel('Carrera').fill(alumno.carrera);
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await expect(page.getByRole('cell', { name: /^Estudiante sintético/ })).toBeVisible();
  await page.getByLabel('Nueva condición').selectOption('LIBRE');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByText('Condición actualizada.')).toBeVisible();
  await page.screenshot({ path: info.outputPath('estudiantes.png'), fullPage: true });
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Archivar', exact: true }).click();
  await page.getByLabel('Solo archivados').check();
  await expect(page.getByRole('cell', { name: 'Archivado' })).toBeVisible();
  await page.getByRole('button', { name: 'Recuperar por DNI' }).click();
  await expect(page.getByLabel('DNI', { exact: true })).toHaveValue(alumno.dni);
});
