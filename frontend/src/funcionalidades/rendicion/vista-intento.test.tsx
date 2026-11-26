import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VistaIntento } from './vista-intento';
import type { Reloj } from './contratos';

const origen: Reloj = {
  recibidoEn: 0,
  intento: {
    id: 'intento', simulacroId: 'simulacro', inicio: '', vence: '', cierre: null,
    estado: 'ACTIVO', tiempoRestanteMs: 60000,
    preguntas: [
      { id: 'p1', enunciado: 'Enunciado sintético uno', alternativas: { A: 'Uno', B: 'Dos', C: 'Tres', D: 'Cuatro', E: 'Cinco' } },
      { id: 'p2', enunciado: 'Enunciado sintético dos', alternativas: { A: 'Uno', B: 'Dos', C: 'Tres', D: 'Cuatro', E: 'Cinco' } },
    ],
    respuestas: [],
  },
};

it('navega a una pregunta pendiente y permite cambiar o quitar la marca', () => {
  const marcar = jest.fn();
  render(<MemoryRouter><VistaIntento origen={{ ...origen, recibidoEn: performance.now() }} modo="virtual"
    marcas={[{ numero: 2, alternativa: 'B', pendiente: true }]} bloqueado={false} marcar={marcar} volver={jest.fn()} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Pregunta anterior' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Pregunta 2, sincronización pendiente' }));
  expect(screen.getByText('Enunciado sintético dos')).toBeVisible();
  expect(screen.getByRole('radio', { name: 'B · Dos' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: 'C · Tres' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quitar respuesta' }));
  expect(marcar.mock.calls).toEqual([[2, 'C'], [2, null]]);
  expect(screen.getByRole('button', { name: 'Pregunta siguiente' })).toBeDisabled();
});

it('ofrece la transición a resultados al confirmar el cierre', () => {
  render(<MemoryRouter><VistaIntento origen={{ ...origen, intento: { ...origen.intento, estado: 'FINALIZADO', tiempoRestanteMs: 0 } }}
    modo="impreso" volver={jest.fn()} /></MemoryRouter>);
  expect(screen.getByText(/Calificación pendiente de consulta/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Ir a Mi nota' })).toHaveAttribute('href', '/panel/postulante/nota');
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
});
