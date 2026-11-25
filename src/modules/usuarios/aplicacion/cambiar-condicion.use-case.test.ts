import { AlcanceAdministrador, RolUsuario } from '../dominio';
import { CambiarCondicionUseCase } from './cambiar-condicion.use-case';

it('CA-RR03 restringe la modificación al rol y a la sede autorizados', async () => {
  const guardar = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const caso = new CambiarCondicionUseCase(guardar);
  const sede = { id: '7', rol: RolUsuario.Administrador, alcanceAdministrador: AlcanceAdministrador.Sede, sedeId: '2' };
  const general = { id: '1', rol: RolUsuario.Administrador, alcanceAdministrador: AlcanceAdministrador.General };
  await expect(caso.ejecutar({ id: '3', rol: RolUsuario.Docente }, '3', 'LIBRE')).resolves.toBe(403);
  await expect(caso.ejecutar(sede, '3', 'OTRA')).resolves.toBe(400);
  await expect(caso.ejecutar(sede, '3', 'LIBRE')).resolves.toBe(404);
  await expect(caso.ejecutar(general, '3', 'MATRICULADO')).resolves.toBe(204);
  expect(guardar.mock.calls).toEqual([['3', 'LIBRE', '2'], ['3', 'MATRICULADO', null]]);
});
