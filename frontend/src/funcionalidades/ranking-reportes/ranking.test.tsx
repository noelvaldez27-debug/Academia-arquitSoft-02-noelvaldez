import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { usarSesion } from '../../app/sesion';
import { MiPosicion, PanelRanking } from './ranking';

jest.mock('../../app/sesion', () => ({ usarSesion: jest.fn() }));
const solicitar = jest.fn();
beforeEach(() => {
  solicitar.mockReset();
  jest.mocked(usarSesion).mockReturnValue({
    solicitar, sesion: null, vencida: false, aviso: '', salir: jest.fn(),
    completarCambio: jest.fn(), ingresar: jest.fn(), configurarSalida: jest.fn(),
  });
});

it('consulta solo el puesto propio y muestra cero definitivo con ámbitos y denominadores', async () => {
  solicitar.mockImplementation(async ruta => ruta.endsWith('/simulacros')
    ? [{ simulacroId: 'SIM', intentoId: 'propio' }, { simulacroId: 'OTRO', intentoId: null }]
    : { definitiva: true, puntaje: 0, general: { puesto: 2, participantes: 4 },
      carrera: { puesto: 1, participantes: 2 }, sede: null, filas: [{ postulanteId: 'privado' }] });
  render(<MiPosicion />);
  await screen.findByRole('option', { name: 'SIM' });
  fireEvent.change(screen.getByLabelText('Simulacro'), { target: { value: 'SIM' } });
  expect(await screen.findByText('Publicación definitiva')).toBeVisible();
  expect(screen.getByText('0.00 / 1000 puntos')).toBeVisible();
  expect(screen.getByText('Puesto 2')).toBeVisible();
  expect(screen.getByText('2 participantes')).toBeVisible();
  expect(screen.queryByText('privado')).toBeNull();
  expect(screen.queryByRole('option', { name: 'OTRO' })).toBeNull();
  expect(solicitar).toHaveBeenLastCalledWith('/api/v1/rankings/SIM/propio', expect.anything());
});

it('preserva empates, limita la página y combina carrera y sede en el ranking administrativo', async () => {
  solicitar.mockImplementation(async ruta => {
    if (ruta.includes('banco-preguntas')) return { datos: [{ id: 'SIM' }] };
    if (ruta.endsWith('/sedes')) return [{ id: 's1', nombre: 'Sede Norte' }];
    return { definitiva: false, participantes: 21, filas: Array.from({ length: 21 }, (_, i) => ({
      postulanteId: 'referencia-' + (i + 1), puesto: i === 2 ? 2 : i + 1, puntaje: 900,
    })) };
  });
  render(<PanelRanking general />);
  await screen.findByRole('option', { name: 'SIM' });
  fireEvent.change(screen.getByLabelText('Simulacro'), { target: { value: 'SIM' } });
  expect(await screen.findByText('Publicación provisional')).toBeVisible();
  const tabla = screen.getByRole('table', { name: 'Posiciones' });
  expect(within(tabla).getAllByRole('row')).toHaveLength(21);
  expect(within(tabla).getAllByRole('cell', { name: '2' })).toHaveLength(2);
  const paginador = within(screen.getByRole('region', { name: 'Ranking administrativo' }));
  fireEvent.click(paginador.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByRole('rowheader', { name: 'referencia-21' })).toBeVisible();
  fireEvent.change(screen.getByLabelText('Carrera'), { target: { value: 'Ingeniería' } });
  fireEvent.change(screen.getByLabelText('Sede'), { target: { value: 's1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  expect(await screen.findByRole('rowheader', { name: 'referencia-1' })).toBeVisible();
  expect(solicitar).toHaveBeenLastCalledWith('/api/v1/rankings/SIM?carrera=Ingenier%C3%ADa&sedeId=s1', expect.anything());
});

it('en la sede usa la referencia y deja el ámbito al servidor, incluso cuando rechaza el acceso', async () => {
  solicitar.mockRejectedValue(new Error('Ámbito no autorizado'));
  render(<PanelRanking general={false} />);
  fireEvent.change(screen.getByLabelText('Referencia del simulacro'), { target: { value: 'SIM' } });
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar simulacro' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ámbito no autorizado');
  expect(screen.queryByLabelText('Sede')).toBeNull();
  expect(solicitar).toHaveBeenCalledTimes(1);
  expect(solicitar).toHaveBeenCalledWith('/api/v1/rankings/SIM', expect.anything());
});
