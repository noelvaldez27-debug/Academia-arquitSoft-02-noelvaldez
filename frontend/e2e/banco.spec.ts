import { expect, test } from '@playwright/test';

test('el administrador crea una pregunta con cinco alternativas y ordena el simulacro', async ({ page }, info) => {
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })).toString('base64url') + '.firma';
  const alternativas = { A: 'Opción uno', B: 'Opción dos', C: 'Opción tres', D: 'Opción cuatro', E: 'Opción cinco' };
  const pregunta = { id: 'p1', cursoId: 'c1', enunciado: 'Pregunta sintética existente', alternativas, correcta: 'A', habilitada: true, propuestaId: null };
  const preguntas = [pregunta];
  await page.route('**/api/**', async route => {
    const ruta = new URL(route.request().url()).pathname;
    const metodo = route.request().method();
    if (ruta.endsWith('/login')) return route.fulfill({ json: { token,
      usuario: { id: '1', nombre: 'Administración sintética', rol: 'ADMINISTRADOR', sedeId: null } } });
    if (ruta.endsWith('/cursos')) return route.fulfill({ json: { datos: [{ id: 'c1', nombre: 'Matemática' }], pagina: 1, hayMas: false } });
    if (ruta.endsWith('/temas')) return route.fulfill({ json: [{ id: 'tema1', nombre: 'Álgebra', cursoId: 'c1' }] });
    if (ruta.endsWith('/preguntas') && metodo === 'POST') {
      const datos = route.request().postDataJSON();
      expect(datos).toMatchObject({ alternativas, correcta: 'D', temaId: 'tema1' });
      preguntas.push({ ...pregunta, ...datos, id: 'p2' });
      return route.fulfill({ status: 201, json: preguntas[1] });
    }
    if (ruta.endsWith('/preguntas')) return route.fulfill({ json: preguntas });
    if (ruta.endsWith('/simulacros') && metodo === 'POST') {
      const datos = route.request().postDataJSON();
      expect(datos).toEqual({ duracionMinutos: 30, preguntas: ['p2', 'p1'] });
      return route.fulfill({ status: 201, json: { ...datos, id: 's1' } });
    }
    if (ruta.endsWith('/simulacros')) return route.fulfill({ json: { datos: [], pagina: 1, hayMas: false } });
    if (ruta.endsWith('/ciclos')) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404 });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('admin@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  const menu = page.getByRole('navigation');
  await menu.getByRole('link', { name: 'Banco de preguntas' }).click();
  await page.getByRole('combobox', { name: 'Curso', exact: true }).selectOption('c1');
  await page.getByRole('button', { name: 'Nueva pregunta' }).click();
  await page.getByLabel('Enunciado').fill('Pregunta sintética nueva');
  for (const [letra, opcion] of Object.entries(alternativas)) await page.getByLabel('Alternativa ' + letra).fill(opcion);
  await page.getByRole('radio', { name: 'Correcta D' }).check();
  await page.getByRole('combobox', { name: 'Tema', exact: true }).last().selectOption('tema1');
  await page.getByRole('button', { name: 'Guardar pregunta' }).click();
  await expect(page.getByText('Pregunta guardada.')).toBeVisible();
  await page.screenshot({ path: info.outputPath('banco.png'), fullPage: true });
  await menu.getByRole('link', { name: 'Simulacros' }).click();
  await page.getByRole('region', { name: 'Editor de simulacro' }).getByRole('combobox', { name: 'Curso', exact: true }).selectOption('c1');
  await page.getByRole('listitem').filter({ hasText: 'Pregunta sintética existente' }).getByRole('button', { name: 'Agregar' }).click();
  await page.getByRole('listitem').filter({ hasText: 'Pregunta sintética nueva' }).getByRole('button', { name: 'Agregar' }).click();
  await page.getByRole('button', { name: 'Subir pregunta 2' }).click();
  await page.getByLabel('Duración en minutos').fill('30');
  await page.getByRole('button', { name: 'Guardar configuración' }).click();
  await expect(page.getByText('Configuración guardada.')).toBeVisible();
});

test('el docente sube una separata y aprueba su propuesta sin autorización externa en su interfaz', async ({ page }, info) => {
  const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })).toString('base64url') + '.firma';
  let recibida = false;
  let aprobada = false;
  const resumen = { id: 'separata', cursoId: 'c1', estado: 'PREGUNTAS_PROPUESTAS', mime: 'application/pdf' };
  await page.route('**/api/**', async route => {
    const ruta = new URL(route.request().url()).pathname;
    const metodo = route.request().method();
    if (ruta.endsWith('/login')) return route.fulfill({ json: { token,
      usuario: { id: '2', nombre: 'Docente sintético', rol: 'DOCENTE', sedeId: null } } });
    if (ruta.endsWith('/cursos')) return route.fulfill({ json: { datos: [{ id: 'c1', nombre: 'Matemática' }], pagina: 1, hayMas: false } });
    if (ruta.endsWith('/temas')) return route.fulfill({ json: [] });
    if (ruta.endsWith('/separatas') && metodo === 'POST') {
      recibida = true;
      return route.fulfill({ status: 202, json: { id: 'separata', estado: 'SUBIDA' } });
    }
    if (ruta.endsWith('/separatas')) return route.fulfill({ json: { datos: recibida ? [resumen] : [], pagina: 1, hayMas: false } });
    if (ruta.endsWith('/aprobar')) { aprobada = true; return route.fulfill({ json: { id: 'propuesta' } }); }
    if (ruta.endsWith('/separata')) return route.fulfill({ json: {
      ...resumen, motivo: null, autorizacion: { estado: 'AUTORIZADA', alcance: ['texto'] },
      propuestas: [{ id: 'propuesta', enunciado: '¿Cuánto es dos más dos?', alternativas: { A: 'Cuatro', B: 'Cinco', C: 'Seis', D: 'Siete', E: 'Ocho' },
        correcta: 'A', estado: aprobada ? 'APROBADA' : 'PROPUESTA' }],
    } });
    return route.fulfill({ status: 404 });
  });
  await page.goto('/acceso');
  await page.getByLabel('Correo institucional').fill('docente@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave de prueba');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Separatas' }).click();
  await page.getByRole('combobox', { name: 'Curso', exact: true }).selectOption('c1');
  await page.getByLabel('Archivo DOCX, PDF, JPG, JPEG o PNG').setInputFiles({
    name: 'material-sintetico.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-sintetico'),
  });
  await page.getByRole('button', { name: 'Subir separata' }).click();
  const revision = page.getByRole('region', { name: 'Revisión de separata' });
  await expect(revision.getByText('Propuestas disponibles')).toBeVisible();
  await expect(revision.getByRole('button', { name: 'Autorizar transferencia' })).toHaveCount(0);
  await revision.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await expect(revision.getByText('Propuesta aprobada.')).toBeVisible();
  await expect(revision.getByText('Aprobada', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('separatas.png'), fullPage: true });
});
