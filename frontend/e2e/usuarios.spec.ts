import { expect, test } from '@playwright/test';

test('consulta credenciales y restablece la clave una sola vez con identidad confirmada', async ({ page }) => {
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 90 })).toString('base64url') + '.firma';
  const estudiante = { id: '21', nombre: 'Estudiante Sintético', dni: '12345678', correo: '12345678@sofia.edu',
    rol: 'POSTULANTE', activo: true, sedeId: '2', carrera: 'MEDICINA' };
  let restablecida = false;
  let consultasHistorial = 0;
  await page.route('**/api/usuarios**', async route => {
    const url = new URL(route.request().url());
    const recurso = url.pathname.replace('/api/usuarios', '');
    if (recurso === '/login') return route.fulfill({ json: { token, usuario: {
      id: '8', nombre: 'Administración sintética', correo: 'admin@example.test', rol: 'ADMINISTRADOR', sedeId: '2',
    } } });
    if (recurso === '/sedes') return route.fulfill({ json: [{ id: '2', nombre: 'Sede sintética' }] });
    if (recurso === '/ciclos') return route.fulfill({ json: [] });
    if (recurso.startsWith('/estudiantes/21/credenciales/historial')) {
      consultasHistorial++;
      return route.fulfill({ json: { estado: { cambioObligatorio: restablecida, venceEn: restablecida ? '2030-01-02T03:04:05Z' : null },
        eventos: restablecida ? [{ id: '1', evento: 'RESTABLECIMIENTO_ADMINISTRATIVO', creadoEn: '2030-01-01T00:00:00Z',
          actor: { id: '8', nombre: 'Administración sintética' } }] : [], paginacion: { pagina: 1, limite: 20, total: restablecida ? 1 : 0 } } });
    }
    if (recurso === '/estudiantes/21/password/restablecer' && route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ identidadVerificada: true });
      restablecida = true;
      return route.fulfill({ headers: { 'Cache-Control': 'private, no-store' }, json: {
        passwordTemporal: 'clave-temporal-ficticia', venceEn: '2030-01-02T03:04:05Z',
      } });
    }
    if (route.request().method() === 'GET') return route.fulfill({ json: { usuarios: [estudiante], total: 1, pagina: 1, limite: 20 } });
    return route.fulfill({ status: 204 });
  });

  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('admin@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave ficticia');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Estudiantes' }).click();
  await page.getByRole('button', { name: 'Ver credenciales' }).click();
  await expect(page.getByText('Sin registro disponible.')).toBeVisible();
  await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Confirmar restablecimiento de contraseña' });
  const confirmar = dialogo.getByRole('checkbox');
  await expect(dialogo.getByRole('button', { name: 'Restablecer y mostrar clave temporal' })).toBeDisabled();
  await confirmar.check();
  await dialogo.getByRole('button', { name: 'Restablecer y mostrar clave temporal' }).click();
  const secreto = page.getByRole('region', { name: 'Contraseña temporal de un solo uso' });
  await expect(secreto.getByLabel('Contraseña temporal')).toHaveText('clave-temporal-ficticia');
  await secreto.getByRole('button', { name: 'Ocultar contraseña temporal' }).click();
  await expect(page.getByText('clave-temporal-ficticia')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver credenciales' }).click();
  await expect(page.getByText('RESTABLECIMIENTO ADMINISTRATIVO')).toBeVisible();
  expect(consultasHistorial).toBeGreaterThanOrEqual(2);
});

test('el administrador de sede registra, cambia condición y archiva en su sede', async ({ page }, info) => {
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 90 })).toString('base64url') + '.firma';
  const alumno = { id: '20', nombre: 'Estudiante sintético', dni: '87654321', correo: 'cuenta@example.test',
    rol: 'POSTULANTE', activo: true, sedeId: '2', carrera: 'Ingeniería' };
  const cicloId = 'ciclo-sintetico';
  let registrado = false;
  let archivado = false;
  await page.route('**/api/usuarios**', async route => {
    const url = new URL(route.request().url());
    const recurso = url.pathname.replace('/api/usuarios', '');
    if (recurso === '/login') return route.fulfill({ json: { token, usuario: { id: '10', nombre: 'Sede sintética',
      correo: 'sede@example.test', rol: 'ADMINISTRADOR', sedeId: '2' } } });
    if (recurso === '/sedes') return route.fulfill({ json: [{ id: '2', nombre: 'Sede de prueba' }, { id: '3', nombre: 'Otra sede' }] });
    if (recurso === '/ciclos') return route.fulfill({ json: [{ id: cicloId, nombre: 'Ciclo sintético', cerradoEn: null }] });
    if (recurso === '/estudiantes') {
      expect(route.request().postDataJSON()).toMatchObject({ sedeId: '2', dni: alumno.dni, cicloId });
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
  await page.getByLabel('Contraseña', { exact: true }).fill('clave de prueba');
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

test('la carga Excel muestra progreso real y permite elegir el historial', async ({ page }, info) => {
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 90 })).toString('base64url') + '.firma';
  const id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  let subida = false;
  let consultas = 0;
  await page.route('**/api/usuarios**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/login')) return route.fulfill({ json: { token, usuario: { id: '1', nombre: 'Administración de prueba', rol: 'ADMINISTRADOR', sedeId: null } } });
    if (url.pathname.endsWith('/ciclos')) return route.fulfill({ json: [{ id: 'ciclo', nombre: 'Ciclo sintético', cerradoEn: null }] });
    if (route.request().method() === 'POST') {
      expect(url.searchParams.get('cicloId')).toBe('ciclo');
      subida = true;
      return route.fulfill({ status: 202, json: { id } });
    }
    if (url.pathname.endsWith(id)) {
      consultas++;
      return route.fulfill({ json: {
        id, estado: consultas === 1 ? 'PROCESANDO' : 'COMPLETADA', totalFilas: 3, creadas: 1, recuperadas: 1,
        yaExistian: 0, rechazadas: 1, errores: [{ fila: 3, motivo: 'DNI inválido' }], avisos: [],
      } });
    }
    return route.fulfill({ json: { cargas: subida ? [{ id, creadaEl: '2026-11-26T12:00:00Z', estado: 'PENDIENTE', propia: true }] : [], pagina: 1, hayMas: false } });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('admin@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Cargas Excel' }).click();
  await page.getByLabel('Archivo Excel (.xlsx)').setInputFiles({
    name: 'sintetico.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('respuesta simulada'),
  });
  await expect(page.getByLabel('Ciclo académico destino')).toHaveValue('ciclo');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Enviar archivo' }).click();
  const detalle = page.getByRole('region', { name: 'Detalle de carga' });
  await expect(detalle.getByText('Procesando', { exact: true })).toBeVisible();
  await expect(detalle.getByText('Completada', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(detalle.getByText('Fila 3 · DNI inválido')).toBeVisible();
  expect(consultas).toBe(2);
  await expect(page.getByRole('region', { name: 'Historial de cargas' }).getByRole('button', { name: /Pendiente/ })).toBeVisible();
  await page.screenshot({ path: info.outputPath('cargas.png'), fullPage: true });
});
