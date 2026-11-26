import { ListarCargasMasivasUseCase } from './listar-cargas-masivas.use-case';
import { AlcanceAdministrador, RolUsuario } from '../dominio';

it('limita el historial al alcance administrativo y solicita una fila adicional', async () => {
  const listar = jest.fn().mockResolvedValue([
    { id: '1', estado: 'COMPLETADA', creadaEl: new Date(0), propia: false },
    { id: '2', estado: 'COMPLETADA', creadaEl: new Date(0), propia: true },
  ]);
  const caso = new ListarCargasMasivasUseCase(listar);
  const actor = { id: '8', rol: RolUsuario.Administrador, sedeId: '2', alcanceAdministrador: AlcanceAdministrador.Sede };
  await expect(caso.ejecutar(actor, 2, 1)).resolves.toMatchObject({ pagina: 2, hayMas: true, cargas: [{ id: '1' }] });
  expect(listar).toHaveBeenLastCalledWith('2', '8', 2, 2);
  await caso.ejecutar({ ...actor, sedeId: null, alcanceAdministrador: AlcanceAdministrador.General }, 1, 20);
  expect(listar).toHaveBeenLastCalledWith(null, '8', 1, 21);
  await expect(caso.ejecutar({ ...actor, rol: RolUsuario.Docente }, 1, 20)).rejects.toThrow();
  await expect(caso.ejecutar({ ...actor, sedeId: null }, 1, 20)).rejects.toThrow();
  expect(listar).toHaveBeenCalledTimes(2);
});
