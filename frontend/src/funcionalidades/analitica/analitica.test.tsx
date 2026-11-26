import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { usarSesion } from '../../app/sesion';
import { EstadisticasAcademicas } from './estadisticas';
import { MiHistorial } from './historial';
import { MiRecomendacion } from './recomendacion';

jest.mock('../../app/sesion', () => ({ usarSesion: jest.fn() }));
const solicitar = jest.fn();
beforeEach(() => {
  solicitar.mockReset();
  jest.mocked(usarSesion).mockReturnValue({
    solicitar, sesion: null, vencida: false, aviso: '', salir: jest.fn(), completarCambio: jest.fn(),
    ingresar: jest.fn(), configurarSalida: jest.fn(),
  });
});

it('distingue el historial vacío de una consulta fallida', async () => {
  solicitar.mockResolvedValueOnce({ historial: [], porCurso: [] }).mockRejectedValueOnce(new Error('Servicio temporalmente no disponible'));
  const vista = render(<MiHistorial />);
  expect(screen.getByRole('status')).toHaveTextContent('Consultando');
  expect(await screen.findByText('Aún no tienes simulacros calificados.')).toBeVisible();
  vista.unmount();
  render(<MiHistorial />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Servicio temporalmente no disponible');
});

it.each([1, 2])('da una alternativa tabular a los gráficos de %i simulacros y conserva el cero evaluado', async cantidad => {
  solicitar.mockResolvedValue({ historial: [
    { simulacroId: 'S1', fecha: '2026-11-24T12:00:00Z', puntaje: 0, correctas: 0, incorrectas: 1, omitidas: 2 },
    { simulacroId: 'S2', fecha: '2026-11-25T12:00:00Z', puntaje: 1000, correctas: 3, incorrectas: 0, omitidas: 0 },
  ].slice(0, cantidad), porCurso: [
    { cursoId: 'MAT', desempeno: 0, total: 3, correctas: 0, incorrectas: 1, omitidas: 2 },
    { cursoId: 'No evaluado', desempeno: 0, total: 0, correctas: 0, incorrectas: 0, omitidas: 0 },
  ] });
  const vista = render(<MiHistorial />);
  const comparacion = await screen.findByRole('table', { name: 'Comparación de simulacros y distribución de respuestas' });
  expect(within(comparacion).getAllByRole('row')).toHaveLength(cantidad + 1);
  expect(within(comparacion).getByText('0.00')).toBeVisible();
  expect(vista.container.querySelectorAll('svg circle')).toHaveLength(cantidad);
  expect(vista.container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('table', { name: 'Porcentajes y conteos por curso' })).toHaveTextContent('0.00 %');
  expect(screen.queryByText('No evaluado')).toBeNull();
});

it('envía filtros combinados y presenta indicadores históricos por curso, tema y pregunta', async () => {
  const fila = { cursoId: 'MAT', total: 5, correctas: 1, incorrectas: 3, omitidas: 1,
    tasaAciertos: 20, tasaErrores: 60, tasaOmisiones: 20 };
  solicitar.mockImplementation(async ruta => ruta.endsWith('/sedes') ? [{ id: '1', nombre: 'Sede Norte' }] : ({
    intentosSinSedeHistorica: 1, porCurso: [fila],
    porTema: [{ ...fila, temaId: null, nombresHistoricos: [] }],
    porPregunta: [{ ...fila, preguntaId: 'p1', enunciado: 'Ecuación histórica', versionesSimulacro: ['S1'], correcta: 'A' }],
  }));
  render(<EstadisticasAcademicas perfil="general" />);
  expect(await screen.findByRole('table', { name: 'Por curso' })).toHaveTextContent('60.00 %');
  await screen.findByRole('option', { name: 'Sede Norte' });
  fireEvent.change(screen.getByLabelText('Referencia del simulacro'), { target: { value: 'S1' } });
  fireEvent.change(screen.getByLabelText('Referencia del curso'), { target: { value: 'MAT' } });
  fireEvent.change(screen.getByLabelText('Referencia del tema'), { target: { value: 'sin-clasificar' } });
  fireEvent.change(screen.getByLabelText('Sede histórica'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  fireEvent.click(screen.getByRole('button', { name: 'Por tema' }));
  expect(await screen.findByRole('rowheader', { name: /Sin clasificar/ })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Por pregunta' }));
  expect(screen.getByRole('rowheader', { name: /Ecuación histórica/ })).toBeVisible();
  expect(screen.queryByText('A', { exact: true })).toBeNull();
  expect(solicitar).toHaveBeenLastCalledWith(
    '/api/v1/analitica/estadisticas?simulacroId=S1&cursoId=MAT&temaId=sin-clasificar&sedeId=1', expect.anything());
});

it.each(['docente', 'sede'] as const)('la consulta de %s no envía sedes ajenas y respeta un rechazo', async perfil => {
  solicitar.mockResolvedValueOnce({ intentosSinSedeHistorica: 0, porCurso: [], porTema: [], porPregunta: [] })
    .mockRejectedValueOnce(new Error('Acceso restringido'));
  render(<EstadisticasAcademicas perfil={perfil} />);
  expect(await screen.findByText('No hay preguntas evaluadas para estos filtros.')).toBeVisible();
  expect(screen.queryByLabelText('Sede histórica')).toBeNull();
  fireEvent.change(screen.getByLabelText('Referencia del curso'), { target: { value: 'no-asignado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Acceso restringido');
  expect(solicitar).toHaveBeenLastCalledWith('/api/v1/analitica/estadisticas?cursoId=no-asignado', expect.anything());
});

it('solo solicita al pulsar y distingue evidencia, prioridades, origen local y errores', async () => {
  solicitar.mockResolvedValueOnce({ estado: 'evidencia_insuficiente' })
    .mockResolvedValueOnce({ estado: 'sin_prioridades' })
    .mockResolvedValueOnce({ estado: 'vigente', origen: 'local', contenido: 'Repasa ecuaciones.' })
    .mockRejectedValueOnce(new Error('Reintenta más tarde'));
  render(<MiRecomendacion />);
  expect(solicitar).not.toHaveBeenCalled();
  const boton = screen.getByRole('button', { name: 'Consultar recomendación' });
  fireEvent.click(boton);
  expect(boton).toBeDisabled();
  expect(await screen.findByText(/Aún no hay cinco preguntas/)).toBeVisible();
  fireEvent.click(boton);
  expect(await screen.findByText(/No hay cursos prioritarios/)).toBeVisible();
  fireEvent.click(boton);
  expect(await screen.findByText('Repasa ecuaciones.')).toBeVisible();
  expect(screen.getByText('Origen: recomendación local')).toBeVisible();
  fireEvent.click(boton);
  expect(await screen.findByRole('alert')).toHaveTextContent('Reintenta más tarde');
  expect(solicitar).toHaveBeenCalledTimes(4);
  expect(solicitar).toHaveBeenLastCalledWith('/api/v1/analitica/mi-recomendacion', expect.objectContaining({ method: 'POST' }));
});
