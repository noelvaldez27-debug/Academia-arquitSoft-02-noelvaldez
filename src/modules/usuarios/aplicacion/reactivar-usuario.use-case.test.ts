import { ReactivarUsuarioUseCase } from './reactivar-usuario.use-case';
import {
  Usuario,
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
  ErrorNoEncontrado,
} from '../dominio';

describe('Caso de Uso: Reactivar Usuario (RF24, RC16, CA-U11)', () => {
  let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;
  let useCase: ReactivarUsuarioUseCase;

  const postulanteHanaInactivo = Usuario.crearPostulante({
    id: 'post-hana',
    nombre: 'Alumno Hana',
    dni: '12345678',
    correo: '12345678@sofia.edu',
    passwordHash: 'hash',
    sedeId: '1',
    carrera: 'MEDICINA',
    activo: false,
  });

  const postulanteUrinInactivo = Usuario.crearPostulante({
    id: 'post-urin',
    nombre: 'Alumno Urin',
    dni: '87654321',
    correo: '87654321@sofia.edu',
    passwordHash: 'hash',
    sedeId: '2',
    carrera: 'DERECHO',
    activo: false,
  });

  const docenteInactivo = Usuario.crearDocente({
    id: 'docente-1',
    nombre: 'Profesor Carlos',
    dni: '55667788',
    correo: '55667788@sofia.edu',
    passwordHash: 'hash',
    activo: false,
  });

  beforeEach(() => {
    mockUsuarioRepository = {
      guardar: jest.fn(),
      actualizar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorDni: jest.fn(),
      buscarPorCorreo: jest.fn(),
      existeAdministradorGeneral: jest.fn(),
      listar: jest.fn(),
    };

    useCase = new ReactivarUsuarioUseCase(mockUsuarioRepository);
  });

  it('debe permitir al administrador general reactivar cualquier usuario', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(postulanteHanaInactivo);

    await useCase.ejecutar({
      usuarioId: 'post-hana',
      ejecutor: {
        id: 'admin-1',
        rol: RolUsuario.Administrador,
        alcanceAdministrador: AlcanceAdministrador.General,
      },
    });

    expect(mockUsuarioRepository.actualizar).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'post-hana',
        activo: true,
      })
    );
  });

  it('debe permitir al administrador de sede reactivar postulantes de su propia sede', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(postulanteHanaInactivo);

    await useCase.ejecutar({
      usuarioId: 'post-hana',
      ejecutor: {
        id: 'admin-sede-hana',
        rol: RolUsuario.Administrador,
        sedeId: '1',
        alcanceAdministrador: AlcanceAdministrador.Sede,
      },
    });

    expect(mockUsuarioRepository.actualizar).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'post-hana',
        activo: true,
      })
    );
  });

  it('debe denegar acceso si el administrador de sede intenta reactivar postulante de otra sede', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(postulanteUrinInactivo);

    await expect(
      useCase.ejecutar({
        usuarioId: 'post-urin',
        ejecutor: {
          id: 'admin-sede-hana',
          rol: RolUsuario.Administrador,
          sedeId: '1',
          alcanceAdministrador: AlcanceAdministrador.Sede,
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);

    expect(mockUsuarioRepository.actualizar).not.toHaveBeenCalled();
  });

  it('debe denegar acceso si el administrador de sede intenta reactivar un docente', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(docenteInactivo);

    await expect(
      useCase.ejecutar({
        usuarioId: 'docente-1',
        ejecutor: {
          id: 'admin-sede-hana',
          rol: RolUsuario.Administrador,
          sedeId: '1',
          alcanceAdministrador: AlcanceAdministrador.Sede,
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);

    expect(mockUsuarioRepository.actualizar).not.toHaveBeenCalled();
  });

  it('debe denegar acceso si un postulante intenta reactivar a alguien', async () => {
    await expect(
      useCase.ejecutar({
        usuarioId: 'post-hana',
        ejecutor: {
          id: 'post-1',
          rol: RolUsuario.Postulante,
          sedeId: '1',
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('debe arrojar ErrorNoEncontrado si el usuario a reactivar no existe', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(null);

    await expect(
      useCase.ejecutar({
        usuarioId: 'no-existe',
        ejecutor: {
          id: 'admin-1',
          rol: RolUsuario.Administrador,
          alcanceAdministrador: AlcanceAdministrador.General,
        },
      })
    ).rejects.toThrow(ErrorNoEncontrado);
  });
});
