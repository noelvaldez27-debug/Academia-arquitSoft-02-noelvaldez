import { GestionarAsignacionesUseCase } from './gestionar-asignaciones.use-case';

it('CA-RR03 asigna y retira cursos existentes solo como administrador general', async () => {
  const guardar = jest.fn();
  const caso = new GestionarAsignacionesUseCase(async id => id === 'd', async id => id === 'c', guardar);
  const admin = { id: 'a', permiso: 'general' } as const;
  await expect(caso.ejecutar({ id: 'd', permiso: 'docente' }, 'd', 'c', true))
    .rejects.toMatchObject({ tipo: 'acceso' });
  await expect(caso.ejecutar(admin, 'otro', 'c', true)).rejects.toMatchObject({ tipo: 'no-encontrado' });
  await expect(caso.ejecutar(admin, 'd', 'otro', true)).rejects.toMatchObject({ tipo: 'no-encontrado' });
  await caso.ejecutar(admin, 'd', 'c', true);
  await caso.ejecutar(admin, 'd', 'c', false);
  expect(guardar.mock.calls).toEqual([['d', 'c', true], ['d', 'c', false]]);
});
