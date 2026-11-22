import { CrearSedeUseCase } from './crear-sede.use-case';
import {
  Sede,
  SedeRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
  ErrorValidacion,
  ErrorConflicto,
} from '../dominio';

describe('Caso de Uso: Crear Sede (RF22, AC05, CA-U14)', () => {
  let mockSedeRepository: jest.Mocked<SedeRepository>;
  let useCase: CrearSedeUseCase;

  const ejecutorAdminGeneral = {
    id: 'admin-1',
    rol: RolUsuario.Administrador,
    alcanceAdministrador: AlcanceAdministrador.General,
  };

  beforeEach(() => {
    mockSedeRepository = {
      guardar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorNombre: jest.fn(),
      listarTodas: jest.fn(),
    };

    useCase = new CrearSedeUseCase(mockSedeRepository);
  });

  it('debe crear una sede nueva con exito cuando lo ejecuta el admin general', async () => {
    mockSedeRepository.buscarPorNombre.mockResolvedValueOnce(null);
    mockSedeRepository.guardar.mockImplementationOnce(async (s) => new Sede({ id: '4', nombre: s.nombre }));

    const sedeCreada = await useCase.ejecutar({
      nombre: 'Norte',
      ejecutor: ejecutorAdminGeneral,
    });

    expect(mockSedeRepository.buscarPorNombre).toHaveBeenCalledWith('Norte');
    expect(mockSedeRepository.guardar).toHaveBeenCalled();
    expect(sedeCreada.id).toBe('4');
    expect(sedeCreada.nombre).toBe('Norte');
  });

  it('debe rechazar con ErrorConflicto si el nombre de la sede ya existe', async () => {
    mockSedeRepository.buscarPorNombre.mockResolvedValueOnce(new Sede({ id: '1', nombre: 'Hana' }));

    await expect(
      useCase.ejecutar({
        nombre: 'Hana',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorConflicto);

    expect(mockSedeRepository.guardar).not.toHaveBeenCalled();
  });

  it('debe rechazar con ErrorValidacion si el nombre es vacio', async () => {
    await expect(
      useCase.ejecutar({
        nombre: '   ',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('debe rechazar con ErrorAccesoDenegado si un administrador de sede intenta crear una sede', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Nueva Sede',
        ejecutor: {
          id: 'admin-sede-1',
          rol: RolUsuario.Administrador,
          sedeId: '1',
          alcanceAdministrador: AlcanceAdministrador.Sede,
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('debe rechazar con ErrorAccesoDenegado si un postulante o docente intenta crear una sede', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Nueva Sede',
        ejecutor: {
          id: 'post-1',
          rol: RolUsuario.Postulante,
          sedeId: '1',
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('debe rechazar si no hay ejecutor autenticado', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Nueva Sede',
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });
});
