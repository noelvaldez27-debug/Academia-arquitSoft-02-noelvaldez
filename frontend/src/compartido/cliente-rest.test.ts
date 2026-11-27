import { ErrorApi, solicitarApi } from './cliente-rest';

it('envía Bearer en consultas privadas y notifica el 401 sin propagar respuesta del servidor', async () => {
  const fetchSimulado = jest.fn().mockResolvedValue({ ok: false, status: 401 });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSimulado });
  const alVencer = jest.fn();
  await expect(solicitarApi('/api/usuarios/sedes', { sesion: { token: 'sintetico', alVencer } }))
    .rejects.toMatchObject({ estado: 401, message: 'Tu sesión terminó. Vuelve a ingresar.' });
  expect(fetchSimulado.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer sintetico');
  expect(alVencer).toHaveBeenCalledTimes(1);
});

it('distingue un fallo de red de un error HTTP', async () => {
  const fetchSimulado = jest.fn().mockRejectedValue(new TypeError());
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSimulado });
  await expect(solicitarApi('/api/usuarios/sedes')).rejects.toBeInstanceOf(ErrorApi);
  await expect(solicitarApi('/api/usuarios/sedes')).rejects.toMatchObject({ estado: 0 });
});

it('permite mostrar una validación segura solo cuando la operación lo solicita', async () => {
  const fetchSimulado = jest.fn().mockResolvedValue({
    ok: false, status: 400,
    clone: () => ({ json: async () => ({ error: 'No se reconocen los encabezados obligatorios.' }) }),
  });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSimulado });
  await expect(solicitarApi('/api/usuarios/cargas-masivas', { mensajeValidacionSeguro: true }))
    .rejects.toMatchObject({ estado: 400, message: 'No se reconocen los encabezados obligatorios.' });
  await expect(solicitarApi('/api/usuarios/cargas-masivas'))
    .rejects.toMatchObject({ estado: 400, message: 'Revisa los datos ingresados.' });
});

it('no muestra mensajes de validación que puedan contener datos sensibles', async () => {
  const fetchSimulado = jest.fn().mockResolvedValue({
    ok: false, status: 422,
    clone: () => ({ json: async () => ({ error: 'Token inválido para usuario' }) }),
  });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchSimulado });
  await expect(solicitarApi('/api/usuarios/cargas-masivas', { mensajeValidacionSeguro: true }))
    .rejects.toMatchObject({ estado: 422, message: 'Revisa los datos ingresados.' });
});
