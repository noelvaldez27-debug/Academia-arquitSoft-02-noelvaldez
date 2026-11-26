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
