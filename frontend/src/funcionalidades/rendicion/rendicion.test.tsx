import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { usarSesion } from '../../app/sesion';
import { Rendicion } from './rendicion';

jest.mock('../../app/sesion', () => ({ usarSesion: jest.fn() }));

it('cancela instrucciones sin iniciar y bloquea un segundo inicio mientras espera la API', async () => {
  let rechazar!: (causa: Error) => void;
  const intento = new Promise((_resolver, fallo) => { rechazar = fallo; });
  const solicitar = jest.fn(ruta => ruta.endsWith('/simulacros') ? Promise.resolve([
    { simulacroId: 'sintetico', intentoId: null, habilitadoEn: null, estado: 'DISPONIBLE' },
  ]) : intento);
  jest.mocked(usarSesion).mockReturnValue({
    solicitar: solicitar as ReturnType<typeof usarSesion>['solicitar'], sesion: null, vencida: false, aviso: '',
    salir: jest.fn(), completarCambio: jest.fn(), ingresar: jest.fn(), configurarSalida: jest.fn(),
  });
  render(<Rendicion />);
  const instrucciones = await screen.findByRole('button', { name: 'Ver instrucciones' });
  fireEvent.click(instrucciones);
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(solicitar).toHaveBeenCalledTimes(1);
  fireEvent.click(instrucciones);
  fireEvent.click(screen.getByLabelText('Ficha impresa'));
  expect(screen.getByLabelText('Ficha impresa')).toBeChecked();
  const iniciar = screen.getByRole('button', { name: 'Comenzar simulacro' });
  fireEvent.click(iniciar);
  fireEvent.click(iniciar);
  expect(solicitar).toHaveBeenCalledTimes(2);
  expect(solicitar).toHaveBeenLastCalledWith('/api/v1/examenes/iniciar',
    expect.objectContaining({ method: 'POST', datos: { simulacroId: 'sintetico' } }));
  await act(async () => rechazar(new Error('El simulacro dejó de estar disponible.')));
  expect(screen.getByRole('alert')).toHaveTextContent('El simulacro dejó de estar disponible.');
  expect(iniciar).toBeEnabled();
});
