import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { usarSesion } from '../../app/sesion';
import { MiPosicion } from './ranking';
import { DesempenoDocente, PanelRanking } from './reportes';
import { descargar } from '../../compartido/descargar';

jest.mock('../../app/sesion', () => ({ usarSesion: jest.fn() }));
jest.mock('../../compartido/descargar', () => ({ descargar: jest.fn() }));
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

it.each([null, 0])('distingue padrón desconocido de tasa cero (%s) y exporta el reporte con el mismo filtro', async tasa => {
  const libro = new Blob(['libro de prueba']);
  solicitar.mockImplementation(async ruta => {
    if (ruta.includes('formato=xlsx')) return libro;
    if (ruta.includes('participacion')) return { estado: 'DEFINITIVO', resumen: {
      inscritos: tasa === null ? null : 20, noParticipantes: tasa === null ? null : 20,
      participantes: 0, enCurso: 0, finalizados: 0, calificados: 0, porcentajeParticipacion: tasa,
    } };
    return { definitiva: false, participantes: 0, filas: [] };
  });
  render(<PanelRanking general={false} />);
  fireEvent.change(screen.getByLabelText('Referencia del simulacro'), { target: { value: 'SIM' } });
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar simulacro' }));
  fireEvent.click(screen.getByRole('button', { name: 'Participación' }));
  expect(await screen.findByText('Publicación definitiva')).toBeVisible();
  expect(screen.getByText('Porcentaje de participación').nextElementSibling).toHaveTextContent(tasa === null ? 'No disponible' : '0 %');
  expect(screen.getByText('Intentos activos').nextElementSibling).toHaveTextContent('0');
  fireEvent.change(screen.getByLabelText('Condición histórica'), { target: { value: 'LIBRE' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Exportar Excel' }));
  expect(await screen.findByRole('button', { name: 'Exportar Excel' })).toBeEnabled();
  expect(solicitar).toHaveBeenLastCalledWith('/api/v1/rankings/SIM/reportes/participacion?condicion=LIBRE&formato=xlsx',
    expect.objectContaining({ formato: 'archivo' }));
  expect(descargar).toHaveBeenCalledWith(libro, 'participacion.xlsx');
});

it('el docente consulta solo agregados y conserva el rechazo de un curso sin asignación', async () => {
  solicitar.mockImplementation(async ruta => {
    if (ruta.includes('banco-preguntas')) return { datos: [{ id: 'c1', nombre: 'Asignado' }, { id: 'c2', nombre: 'No asignado' }] };
    if (ruta.endsWith('/c1')) return { definitiva: false, resumen: { calificados: 3, correctas: 2, incorrectas: 1, omitidas: 0 } };
    throw new Error('Curso sin asignación');
  });
  render(<DesempenoDocente />);
  fireEvent.change(screen.getByLabelText('Referencia del simulacro'), { target: { value: 'SIM' } });
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar simulacro' }));
  await screen.findByRole('option', { name: 'Asignado' });
  fireEvent.change(screen.getByLabelText('Curso', { exact: true }), { target: { value: 'c1' } });
  expect(await screen.findByRole('region', { name: 'Agregados del curso' })).toHaveTextContent('Calificados3');
  expect(screen.queryByRole('button', { name: 'Exportar Excel' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Curso', { exact: true }), { target: { value: 'c2' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Curso sin asignación');
});
