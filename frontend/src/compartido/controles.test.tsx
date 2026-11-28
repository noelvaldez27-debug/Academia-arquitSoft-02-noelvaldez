import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampoPassword } from './controles';

it('mantiene la contraseña oculta inicialmente y permite alternar el ojo con teclado', async () => {
  const usuario = userEvent.setup();
  render(<CampoPassword id="clave" name="clave" etiqueta="Contraseña" required />);
  const campo = screen.getByLabelText('Contraseña');
  const boton = screen.getByRole('button', { name: 'Mostrar contraseña: Contraseña' });
  expect(campo).toHaveAttribute('type', 'password');
  expect(boton).toHaveAttribute('aria-pressed', 'false');

  await usuario.tab();
  await usuario.tab();
  expect(boton).toHaveFocus();
  await usuario.keyboard(' ');
  expect(campo).toHaveAttribute('type', 'text');
  expect(screen.getByRole('button', { name: 'Ocultar contraseña: Contraseña' })).toHaveAttribute('aria-pressed', 'true');
  await usuario.keyboard('{Enter}');
  expect(campo).toHaveAttribute('type', 'password');
});
