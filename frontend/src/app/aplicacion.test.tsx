import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Aplicacion } from './aplicacion';

function montar(ruta: string) {
  render(<MemoryRouter initialEntries={[ruta]}><Aplicacion /></MemoryRouter>);
}

function simularAcceso(cambioPasswordRequerido = false, estado = 200) {
  const token = 'cabecera.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 })) + '.firma';
  const api = jest.fn().mockResolvedValue({
    status: estado, ok: estado === 200,
    json: async () => ({ token, cambioPasswordRequerido, usuario: {
      id: 'u1', nombre: 'Docente sintético', correo: 'docente@example.test', rol: 'DOCENTE', sedeId: null,
    } }),
  });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: api });
  return api;
}

async function ingresar() {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Correo institucional'), 'docente@example.test');
  await usuario.type(screen.getByLabelText('Contraseña'), 'clave local de prueba');
  await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
  return usuario;
}

it('protege una URL directa sin sesión', async () => {
  montar('/panel/general/usuarios');
  expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

it('inicia, muestra el menú docente y limpia la sesión al salir', async () => {
  const api = simularAcceso();
  montar('/acceso');
  const usuario = await ingresar();
  expect(await screen.findByRole('navigation')).toBeVisible();
  expect(screen.getByRole('navigation').getAttribute('aria-label')).toBe('Navegación principal');
  expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
  expect(api).toHaveBeenCalledWith('/api/usuarios/login', expect.objectContaining({ method: 'POST' }));
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
  await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

it('separa la credencial provisional de las rutas del panel', async () => {
  simularAcceso(true);
  montar('/acceso');
  await ingresar();
  expect(await screen.findByRole('heading', { name: 'Cambia tu contraseña provisional' })).toBeVisible();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

it('muestra un error comprensible ante credenciales rechazadas', async () => {
  simularAcceso(false, 401);
  montar('/acceso');
  await ingresar();
  expect(await screen.findByRole('alert')).toHaveTextContent('Verifica tu correo');
});

it('cambia la contraseña provisional y vuelve al acceso', async () => {
  const api = simularAcceso(true);
  api.mockResolvedValueOnce(await api()).mockResolvedValue({ status: 204, ok: true });
  montar('/acceso');
  const usuario = await ingresar();
  await usuario.type(await screen.findByLabelText('Contraseña provisional'), 'clave local de prueba');
  await usuario.type(screen.getByLabelText('Nueva contraseña', { exact: true }), 'otra clave de prueba');
  await usuario.type(screen.getByLabelText('Confirmar nueva contraseña'), 'otra clave de prueba');
  await usuario.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  expect(await screen.findByText('Contraseña actualizada. Vuelve a ingresar.')).toBeVisible();
  expect(api).toHaveBeenLastCalledWith('/api/usuarios/password', expect.objectContaining({ method: 'PATCH' }));
});
