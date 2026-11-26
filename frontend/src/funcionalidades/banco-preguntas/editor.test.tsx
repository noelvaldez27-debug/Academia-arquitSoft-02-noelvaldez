import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { EditorPregunta } from './editor';

it('envía cinco alternativas y una clave, y bloquea el envío mientras guarda', async () => {
  let terminar!: () => void;
  const guardar = jest.fn(() => new Promise<void>(fin => { terminar = fin; }));
  render(<EditorPregunta temas={[{ id: 'tema', nombre: 'Tema sintético', cursoId: 'curso' }]} guardar={guardar} />);
  fireEvent.change(screen.getByLabelText('Enunciado'), { target: { value: ' Enunciado sintético ' } });
  for (const letra of ['A', 'B', 'C', 'D', 'E']) {
    fireEvent.change(screen.getByLabelText('Alternativa ' + letra), { target: { value: 'Opción ' + letra } });
  }
  fireEvent.click(screen.getByRole('radio', { name: 'Correcta B' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Tema' }), { target: { value: 'tema' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar pregunta' }));
  expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardando…' }));
  expect(guardar).toHaveBeenCalledTimes(1);
  expect(guardar).toHaveBeenCalledWith({ enunciado: 'Enunciado sintético', correcta: 'B', temaId: 'tema',
    alternativas: { A: 'Opción A', B: 'Opción B', C: 'Opción C', D: 'Opción D', E: 'Opción E' } });
  terminar();
  expect(await screen.findByRole('button', { name: 'Guardar pregunta' })).toBeEnabled();
});

it('valida alternativas en blanco, conserva el borrador tras un error y permite reintentar', async () => {
  const inicial = { enunciado: 'Pregunta sintética', alternativas: { A: 'Uno', B: 'Dos', C: 'Tres', D: 'Cuatro', E: 'Cinco' }, correcta: 'A' as const };
  const guardar = jest.fn().mockRejectedValueOnce(new Error('Conflicto al guardar.')).mockResolvedValueOnce(undefined);
  render(<EditorPregunta inicial={inicial} habilitada temas={[]} guardar={guardar} />);
  fireEvent.change(screen.getByLabelText('Alternativa E'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar pregunta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('cinco alternativas');
  expect(guardar).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Alternativa E'), { target: { value: 'Cinco editado' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Correcta E' }));
  expect(screen.getByRole('radio', { name: 'Correcta A' })).not.toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Habilitada' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar pregunta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Conflicto al guardar.');
  expect(screen.getByLabelText('Alternativa E')).toHaveValue('Cinco editado');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar pregunta' }));
  expect(guardar).toHaveBeenLastCalledWith({
    ...inicial, correcta: 'E', alternativas: { ...inicial.alternativas, E: 'Cinco editado' }, temaId: null, habilitada: false,
  });
  expect(await screen.findByRole('button', { name: 'Guardar pregunta' })).toBeEnabled();
});
