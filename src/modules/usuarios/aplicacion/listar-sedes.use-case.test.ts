import { ListarSedesUseCase } from './listar-sedes.use-case';
import {
  Sede,
  SedeRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
} from '../dominio';

describe('Caso de Uso: Listar Sedes (RF22, AC05, CA-U14)', () => {
  let mockSedeRepository: jest.Mocked<SedeRepository>;
  let useCase: ListarSedesUseCase;

  const sedesEjemplo = [
    new Sede({ id: '1', nombre: 'Hana' }),
    new Sede({ id: '2', nombre: 'Urin' }),
    new Sede({ id: '3', nombre: 'Central' }),
  ];

  beforeEach(() => {
    mockSedeRepository = {
      guardar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorNombre: jest.fn(),
      listarTodas: jest.fn().mockResolvedValue(sedesEjemplo),
    };

    useCase = new ListarSedesUseCase(mockSedeRepository);
  });

  it('debe permitir a cualquier administrador autenticado listar las sedes', async () => {
    const sedes = await useCase.ejecutar({
      ejecutor: {
        id: 'admin-1',
        rol: RolUsuario.Administrador,
        alcanceAdministrador: AlcanceAdministrador.General,
      },
    });

    expect(mockSedeRepository.listarTodas).toHaveBeenCalled();
    expect(sedes).toHaveLength(3);
    expect(sedes[0].nombre).toBe('Hana');
  });

  it('debe permitir a un administrador de sede listar las sedes', async () => {
    const sedes = await useCase.ejecutar({
      ejecutor: {
        id: 'admin-sede-1',
        rol: RolUsuario.Administrador,
        sedeId: '1',
        alcanceAdministrador: AlcanceAdministrador.Sede,
      },
    });

    expect(sedes).toHaveLength(3);
  });

  it('debe rechazar con ErrorAccesoDenegado si un postulante o docente intenta listar sedes', async () => {
    await expect(
      useCase.ejecutar({
        ejecutor: {
          id: 'post-1',
          rol: RolUsuario.Postulante,
          sedeId: '1',
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);

    await expect(
      useCase.ejecutar({
        ejecutor: {
          id: 'docente-1',
          rol: RolUsuario.Docente,
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('debe rechazar si no hay usuario autenticado', async () => {
    await expect(useCase.ejecutar({})).rejects.toThrow(ErrorAccesoDenegado);
  });
});
