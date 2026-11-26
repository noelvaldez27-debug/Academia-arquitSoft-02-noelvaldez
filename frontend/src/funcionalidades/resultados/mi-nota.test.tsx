import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usarSesion } from '../../app/sesion';
import { ErrorApi } from '../../compartido/cliente-rest';
import { MiNota } from './mi-nota';

jest.mock('../../app/sesion', () => ({ usarSesion: jest.fn() }));

const solicitar = jest.fn();
const consultarNota = () => solicitar.mock.calls.filter(([ruta]) => ruta === '/api/v1/resultados/intento');
const pendiente = { estado: 'PENDIENTE', examenId: 'intento' };
const nota = {
  estado: 'PROCESADO', examenId: 'intento', simulacroId: 'SIM-1', puntaje: 0,
  correctas: 0, incorrectas: 1, omitidas: 2,
  porCurso: [{ cursoId: 'MAT', correctas: 0, incorrectas: 1, omitidas: 2 }],
};

beforeEach(() => {
  jest.useFakeTimers();
  solicitar.mockReset();
  jest.mocked(usarSesion).mockReturnValue({
    solicitar, sesion: null, vencida: false, aviso: '', salir: jest.fn(), completarCambio: jest.fn(),
    ingresar: jest.fn(), configurarSalida: jest.fn(),
  });
});
afterEach(() => jest.useRealTimers());

function abrir(referencia?: string) {
  return render(<MemoryRouter initialEntries={[{ pathname: '/panel/postulante/nota',
    state: referencia ? { intentoId: referencia } : null }]}>
    <MiNota />
  </MemoryRouter>);
}

function responder(leer: (opciones: { signal: AbortSignal; recibirCabeceras: (c: Headers) => void }) => unknown) {
  solicitar.mockImplementation(async (ruta, opciones) => {
    if (ruta.endsWith('/simulacros')) return [
      { estado: 'FINALIZADO', simulacroId: 'SIM-1', intentoId: 'intento' },
      { estado: 'EN_CURSO', simulacroId: 'SIM-2', intentoId: 'activo' },
    ];
    if (ruta === '/api/v1/examenes/intento') return { inicio: '2026-11-26T15:00:00Z' };
    return leer(opciones);
  });
}

async function avanzar(ms = 0) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}

it('respeta Retry-After, no solapa consultas y muestra cero definitivo y el desglose', async () => {
  let resolver!: (valor: typeof nota) => void;
  const resultado = new Promise<typeof nota>(resolve => { resolver = resolve; });
  const leer = jest.fn().mockImplementationOnce(opciones => {
    opciones.recibirCabeceras(new Headers({ 'Retry-After': '4' }));
    return pendiente;
  }).mockReturnValueOnce(resultado);
  responder(leer);
  abrir('intento');
  await avanzar();
  expect(screen.getByText(/Calificación pendiente/)).toBeVisible();
  await avanzar(3999);
  expect(leer).toHaveBeenCalledTimes(1);
  await avanzar(1);
  await avanzar(8000);
  expect(leer).toHaveBeenCalledTimes(2);
  await act(async () => resolver(nota));
  expect(screen.getByRole('heading', { name: 'Calificación definitiva' })).toBeVisible();
  expect(screen.getByText('0.00')).toBeVisible();
  expect(screen.getByText(/26 de noviembre de 2026/)).toHaveAttribute('datetime', '2026-11-26T15:00:00Z');
  expect(within(screen.getByRole('row', { name: 'MAT 0 1 2' })).getAllByRole('cell')).toHaveLength(3);
  await avanzar(65000);
  expect(leer).toHaveBeenCalledTimes(2);
});

it('permite elegir solo intentos finalizados y muestra el puntaje máximo de la API', async () => {
  responder(() => ({ ...nota, puntaje: 1000, correctas: 3, incorrectas: 0, omitidas: 0 }));
  abrir();
  await avanzar();
  expect(consultarNota()).toHaveLength(0);
  expect(screen.queryByRole('option', { name: 'SIM-2' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Simulacro realizado'), { target: { value: 'intento' } });
  await avanzar();
  expect(screen.getByText('/ 1000 puntos').parentElement?.textContent).toMatch(/1.?000\.00/);
});

it('cancela solicitudes en vuelo al salir y pausa el sondeo prolongado', async () => {
  responder(() => new Promise(() => {}));
  const vista = abrir('intento');
  vista.unmount();
  expect(consultarNota()[0][1].signal.aborted).toBe(true);
  responder(() => pendiente);
  abrir('intento');
  await avanzar(60000);
  expect(screen.getByText(/consulta automática se pausó/)).toBeVisible();
  const cantidad = consultarNota().length;
  await avanzar(10000);
  expect(consultarNota()).toHaveLength(cantidad);
  fireEvent.click(screen.getByRole('button', { name: 'Volver a consultar' }));
  await avanzar();
  expect(consultarNota()).toHaveLength(cantidad + 1);
});

it.each([
  [404, /no está disponible/, false],
  [403, /Consulta rechazada/, false],
  [401, /Consulta rechazada/, false],
  [503, /Consulta rechazada/, true],
])('detiene el sondeo ante HTTP %i', async (estado, mensaje, reintentar) => {
  responder(jest.fn().mockReturnValueOnce(pendiente).mockImplementation(() => {
    throw new ErrorApi(estado, 'Consulta rechazada');
  }));
  abrir('intento');
  await avanzar(2000);
  expect(screen.getByText(mensaje)).toBeVisible();
  expect(Boolean(screen.queryByRole('button', { name: 'Volver a consultar' }))).toBe(reintentar);
  await avanzar(120000);
  expect(consultarNota()).toHaveLength(2);
});
