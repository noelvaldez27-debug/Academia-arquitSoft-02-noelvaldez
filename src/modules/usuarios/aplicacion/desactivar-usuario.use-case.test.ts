import { DesactivarUsuarioUseCase } from './desactivar-usuario.use-case';
import {
  Usuario,
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
  ErrorValidacion,
  ErrorNoEncontrado,
} from '../dominio';

describe('Caso de Uso: Desactivar Usuario (RF24, RC16, CA-U11)', () => {
  let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;
  let useCase: DesactivarUsuarioUseCase;

  const adminGeneral = Usuario.crearAdministradorGeneral({
    id: 'admin-1',
    nombre: 'Admin General',
    correo: 'admin@sofia.edu',
    passwordHash: 'hash',
  });

  const adminSedeHana = Usuario.crearAdministradorSede({
    id: 'admin-sede-hana',
    nombre: 'Admin Hana',
    correo: 'admin.hana@sofia.edu',
    passwordHash: 'hash',
    sedeId: '1',
  });

  const postulanteHana = Usuario.crearPostulante({
    id: 'post-hana',
    nombre: 'Alumno Hana',
    dni: '12345678',
    correo: '12345678@sofia.edu',
    passwordHash: 'hash',
    sedeId: '1',
    carrera: 'MEDICINA',
    activo: true,
  });

  const postulanteUrin = Usuario.crearPostulante({
    id: 'post-urin',
    nombre: 'Alumno Urin',
    dni: '87654321',
    correo: '87654321@sofia.edu',
    passwordHash: 'hash',
    sedeId: '2',
    carrera: 'DERECHO',
    activo: true,
  });

  const docente = Usuario.crearDocente({
    id: 'docente-1',
    nombre: 'Profesor Carlos',
    dni: '55667788',
    correo: '55667788@sofia.edu',
    passwordHash: 'hash',
    activo: true,
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

    useCase = new DesactivarUsuarioUseCase(mockUsuarioRepository);
  });

  it('debe permitir al administrador general desactivar un postulante', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(postulanteHana);

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
        activo: false,
      })
    );
  });

  it('debe permitir al administrador general desactivar un docente', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(docente);

    await useCase.ejecutar({
      usuarioId: 'docente-1',
      ejecutor: {
        id: 'admin-1',
        rol: RolUsuario.Administrador,
        alcanceAdministrador: AlcanceAdministrador.General,
      },
    });

    expect(mockUsuarioRepository.actualizar).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'docente-1',
        activo: false,
      })
    );
  });

  it('debe permitir al administrador de sede desactivar postulantes de su propia sede', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(postulanteHana);

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
        activo: false,
      })
    );
  });

  it('debe rechazar si un usuario intenta desactivarse a si mismo', async () => {
    await expect(
      useCase.ejecutar({
        usuarioId: 'admin-1',
        ejecutor: {
          id: 'admin-1',
          rol: RolUsuario.Administrador,
          alcanceAdministrador: AlcanceAdministrador.General,
        },
      })
    ).rejects.toThrow(ErrorValidacion);

    expect(mockUsuarioRepository.actualizar).not.toHaveBeenCalled();
  });

  it('debe rechazar si se intenta desactivar al administrador general', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(adminGeneral);

    await expect(
      useCase.ejecutar({
        usuarioId: 'admin-1',
        ejecutor: {
          id: 'admin-otro',
          rol: RolUsuario.Administrador,
          alcanceAdministrador: AlcanceAdministrador.General,
        },
      })
    ).rejects.toThrow(ErrorValidacion);

    expect(mockUsuarioRepository.actualizar).not.toHaveBeenCalled();
  });

  it('debe denegar acceso si el administrador de sede intenta desactivar postulante de otra sede', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(postulanteUrin);

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

  it('debe denegar acceso si el administrador de sede intenta desactivar un docente', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(docente);

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

  it('debe denegar acceso si un postulante o docente intenta desactivar', async () => {
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

    await expect(
      useCase.ejecutar({
        usuarioId: 'post-hana',
        ejecutor: {
          id: 'docente-1',
          rol: RolUsuario.Docente,
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('debe arrojar ErrorNoEncontrado si el usuario a desactivar no existe', async () => {
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
