import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usarSesion } from '../../app/sesion';
import { GestionUsuarios } from './gestion';

jest.mock('../../app/sesion', () => ({ usarSesion: jest.fn() }));

const solicitar = jest.fn();
const estudiante = { id: '21', nombre: 'Estudiante Sintético', dni: '12345678', correo: '12345678@sofia.edu',
  rol: 'POSTULANTE', activo: true, sedeId: '2', carrera: 'MEDICINA' };

beforeEach(() => {
  solicitar.mockReset();
  jest.mocked(usarSesion).mockReturnValue({
    solicitar, sesion: { id: '8', sedeId: '2', perfil: 'sede', nombre: 'Administración sintética', token: 'token', cambioInicial: false, vence: Date.now() + 60_000 },
    vencida: false, aviso: '', salir: jest.fn(), completarCambio: jest.fn(), ingresar: jest.fn(), configurarSalida: jest.fn(),
  });
  solicitar.mockImplementation(async (ruta: string, opciones?: { method?: string }) => {
    if (ruta === '/api/usuarios/sedes') return [{ id: '2', nombre: 'Sede sintética' }];
    if (ruta === '/api/usuarios/ciclos') return [];
    if (ruta === '/api/usuarios?rol=POSTULANTE&pagina=1') return { usuarios: [estudiante], total: 1, pagina: 1, limite: 20 };
    if (ruta.startsWith('/api/usuarios/estudiantes/21/credenciales/historial')) return {
      estado: { cambioObligatorio: false, venceEn: null }, eventos: [], paginacion: { pagina: 1, limite: 20, total: 0 },
    };
    if (ruta === '/api/usuarios/estudiantes/21/password/restablecer' && opciones?.method === 'POST') {
      return { passwordTemporal: 'temporal-sintetica-una-vez', venceEn: '2030-01-02T03:04:05Z' };
    }
    return undefined;
  });
});

it('consulta historial vacío y muestra una sola vez el secreto tras confirmar identidad', async () => {
  const usuario = userEvent.setup();
  render(<GestionUsuarios seccion="estudiantes" />);
  await usuario.click(await screen.findByRole('button', { name: 'Ver credenciales' }));
  expect(await screen.findByText('Sin registro disponible.')).toBeVisible();
  expect(screen.getByText(/Sin cambio obligatorio/)).toBeVisible();

  await usuario.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
  const dialogo = screen.getByRole('dialog', { name: 'Confirmar restablecimiento de contraseña' });
  const confirmar = within(dialogo).getByRole('checkbox');
  expect(within(dialogo).getByRole('button', { name: 'Restablecer y mostrar clave temporal' })).toBeDisabled();
  await usuario.click(confirmar);
  await usuario.click(within(dialogo).getByRole('button', { name: 'Restablecer y mostrar clave temporal' }));

  const secreto = await screen.findByRole('region', { name: 'Contraseña temporal de un solo uso' });
  expect(within(secreto).getByLabelText('Contraseña temporal')).toHaveTextContent('temporal-sintetica-una-vez');
  expect(solicitar).toHaveBeenCalledWith('/api/usuarios/estudiantes/21/password/restablecer', {
    method: 'POST', datos: { identidadVerificada: true },
  });
  await usuario.click(within(secreto).getByRole('button', { name: 'Ocultar contraseña temporal' }));
  expect(screen.queryByText('temporal-sintetica-una-vez')).not.toBeInTheDocument();
});
