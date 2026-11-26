import { expect, test } from '@playwright/test';

const perfiles = [
  { ruta: 'general', rol: 'ADMINISTRADOR', sedeId: null, destinos: ['Usuarios', 'Cargas Excel', 'Sedes',
    'Ciclos académicos', 'Banco de preguntas', 'Separatas', 'Simulacros', 'Reportes', 'Analítica', 'Mi cuenta'] },
  { ruta: 'sede', rol: 'ADMINISTRADOR', sedeId: '1', destinos: ['Estudiantes', 'Cargas Excel', 'Ciclos académicos',
    'Reportes', 'Analítica', 'Mi cuenta'] },
  { ruta: 'docente', rol: 'DOCENTE', sedeId: null, destinos: ['Separatas', 'Desempeño del grupo', 'Mi cuenta'] },
  { ruta: 'postulante', rol: 'POSTULANTE', sedeId: '1', destinos: ['Simulacros', 'Mi nota', 'Mi posición',
    'Mi historial', 'Recomendación', 'Mi cuenta'] },
];

for (const perfil of perfiles) {
  test('abre los destinos del perfil ' + perfil.ruta, async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', error => errores.push(error.message));
    const token = 'cabecera.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })).toString('base64url') + '.firma';
    await page.route('**/api/**', route => {
      const ruta = new URL(route.request().url()).pathname;
      if (ruta.endsWith('/login')) return route.fulfill({ json: { token, usuario: {
        id: 'demo', nombre: 'Cuenta sintética', rol: perfil.rol, sedeId: perfil.sedeId,
      } } });
      if (ruta.endsWith('/estadisticas')) return route.fulfill({ json: {
        intentosSinSedeHistorica: 0, porCurso: [], porTema: [], porPregunta: [],
      } });
      if (ruta.endsWith('/mi-historial')) return route.fulfill({ json: { historial: [], porCurso: [] } });
      if (ruta === '/api/usuarios') return route.fulfill({ json: { usuarios: [], pagina: 1, limite: 20, total: 0 } });
      if (ruta.endsWith('/cargas-masivas')) return route.fulfill({ json: { cargas: [], pagina: 1, hayMas: false } });
      if (ruta.endsWith('/sedes') || ruta.endsWith('/ciclos') || ruta.startsWith('/api/v1/examenes')) {
        return route.fulfill({ json: [] });
      }
      return route.fulfill({ json: { datos: [], pagina: 1, hayMas: false } });
    });
    await page.goto('/acceso');
    await page.getByLabel('Correo institucional').fill('cuenta@example.test');
    await page.getByLabel('Contraseña').fill('clave local de prueba');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(new RegExp('/panel/' + perfil.ruta + '$'));
    const menu = page.getByRole('navigation');
    await expect(menu.getByRole('link')).toHaveCount(perfil.destinos.length + 1);
    for (const destino of perfil.destinos) {
      await menu.getByRole('link', { name: destino, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name: destino, exact: true })).toBeVisible();
      await expect(page.getByText('Esta sección se habilitará en su fase de desarrollo.')).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(errores).toEqual([]);
  });
}
