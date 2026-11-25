import { AlcanceAdministrador, CargaMasiva, CargaMasivaRepository, ErrorAccesoDenegado, RolUsuario } from '../dominio';
import { ConsultarCargaMasivaUseCase } from './consultar-carga-masiva.use-case';

describe('ConsultarCargaMasivaUseCase (CA-U13)', () => {
  const carga = new CargaMasiva({ id: 'carga', usuarioId: 2, sedeId: null });
  const buscarPorId = jest.fn().mockResolvedValue(carga);
  const caso = new ConsultarCargaMasivaUseCase({ buscarPorId } as unknown as CargaMasivaRepository);

  beforeEach(() => buscarPorId.mockClear());

  it('permite al administrador general consultar una carga de alcance general', async () => {
    await expect(caso.ejecutar(carga.id, {
      id: '1', rol: RolUsuario.Administrador, alcanceAdministrador: AlcanceAdministrador.General,
    })).resolves.toMatchObject({ id: carga.id, estado: 'PENDIENTE' });
  });

  it('impide al administrador de sede consultar cargas de alcance general', async () => {
    await expect(caso.ejecutar(carga.id, {
      id: '2', rol: RolUsuario.Administrador, alcanceAdministrador: AlcanceAdministrador.Sede, sedeId: '1',
    })).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('rechaza a un docente antes de consultar el repositorio', async () => {
    await expect(caso.ejecutar(carga.id, {
      id: '3', rol: RolUsuario.Docente,
    })).rejects.toThrow(ErrorAccesoDenegado);
    expect(buscarPorId).not.toHaveBeenCalled();
  });
});
