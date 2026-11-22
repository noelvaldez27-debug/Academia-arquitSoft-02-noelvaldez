import { ListarUsuariosUseCase } from './listar-usuarios.use-case';
import {
  Usuario,
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
  ResultadoPaginadoUsuarios,
} from '../dominio';

describe('Caso de Uso: Listar Usuarios (RF23, CA-U10)', () => {
  let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;
  let useCase: ListarUsuariosUseCase;

  const usuarioPostulanteHana = new Usuario({
    id: '1',
    nombre: 'Juan Perez',
    dni: '12345678',
    correo: '12345678@sofia.edu',
    passwordHash: 'hash_secreto_1',
    rol: RolUsuario.Postulante,
    activo: true,
    sedeId: '1',
    carrera: 'MEDICINA',
  });

  const usuarioDocente = new Usuario({
    id: '2',
    nombre: 'Profesor Carlos',
    dni: '87654321',
    correo: '87654321@sofia.edu',
    passwordHash: 'hash_secreto_2',
    rol: RolUsuario.Docente,
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

    useCase = new ListarUsuariosUseCase(mockUsuarioRepository);
  });

  it('debe permitir al administrador general listar usuarios sin filtros', async () => {
    const respuestaRepo: ResultadoPaginadoUsuarios = {
      usuarios: [usuarioPostulanteHana, usuarioDocente],
      total: 2,
      pagina: 1,
      limite: 20,
    };
    mockUsuarioRepository.listar.mockResolvedValue(respuestaRepo);

    const resultado = await useCase.ejecutar({
      ejecutor: {
        id: '100',
        rol: RolUsuario.Administrador,
        alcanceAdministrador: AlcanceAdministrador.General,
      },
      pagina: 1,
      limite: 20,
    });

    expect(mockUsuarioRepository.listar).toHaveBeenCalledWith({
      rol: undefined,
      sedeId: undefined,
      pagina: 1,
      limite: 20,
    });
    expect(resultado.total).toBe(2);
    expect(resultado.usuarios).toHaveLength(2);
    // Verificar que no se expone el hash ni password (AC04)
    expect((resultado.usuarios[0] as any).passwordHash).toBeUndefined();
    expect((resultado.usuarios[0] as any).password).toBeUndefined();
    expect(resultado.usuarios[0].nombre).toBe('Juan Perez');
  });

  it('debe permitir al administrador general filtrar por rol y sede', async () => {
    mockUsuarioRepository.listar.mockResolvedValue({
      usuarios: [usuarioPostulanteHana],
      total: 1,
      pagina: 1,
      limite: 10,
    });

    const resultado = await useCase.ejecutar({
      rol: RolUsuario.Postulante,
      sedeId: '1',
      pagina: 1,
      limite: 10,
      ejecutor: {
        id: '100',
        rol: RolUsuario.Administrador,
        alcanceAdministrador: AlcanceAdministrador.General,
      },
    });

    expect(mockUsuarioRepository.listar).toHaveBeenCalledWith({
      rol: RolUsuario.Postulante,
      sedeId: '1',
      pagina: 1,
      limite: 10,
    });
    expect(resultado.usuarios).toHaveLength(1);
  });

  it('debe permitir al administrador de sede listar solo postulantes de su sede', async () => {
    mockUsuarioRepository.listar.mockResolvedValue({
      usuarios: [usuarioPostulanteHana],
      total: 1,
      pagina: 1,
      limite: 20,
    });

    const resultado = await useCase.ejecutar({
      ejecutor: {
        id: '101',
        rol: RolUsuario.Administrador,
        sedeId: '1',
        alcanceAdministrador: AlcanceAdministrador.Sede,
      },
    });

    expect(mockUsuarioRepository.listar).toHaveBeenCalledWith({
      rol: RolUsuario.Postulante,
      sedeId: '1',
      pagina: 1,
      limite: 20,
    });
    expect(resultado.usuarios[0].sedeId).toBe('1');
  });

  it('debe denegar acceso si el administrador de sede intenta consultar otra sede', async () => {
    await expect(
      useCase.ejecutar({
        sedeId: '2', // sede distinta a la suya ('1')
        ejecutor: {
          id: '101',
          rol: RolUsuario.Administrador,
          sedeId: '1',
          alcanceAdministrador: AlcanceAdministrador.Sede,
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);

    expect(mockUsuarioRepository.listar).not.toHaveBeenCalled();
  });

  it('debe denegar acceso si el administrador de sede intenta filtrar por un rol distinto de postulante', async () => {
    await expect(
      useCase.ejecutar({
        rol: RolUsuario.Docente,
        ejecutor: {
          id: '101',
          rol: RolUsuario.Administrador,
          sedeId: '1',
          alcanceAdministrador: AlcanceAdministrador.Sede,
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);

    expect(mockUsuarioRepository.listar).not.toHaveBeenCalled();
  });

  it('debe denegar acceso si el ejecutor es Postulante', async () => {
    await expect(
      useCase.ejecutar({
        ejecutor: {
          id: '1',
          rol: RolUsuario.Postulante,
          sedeId: '1',
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('debe denegar acceso si el ejecutor es Docente', async () => {
    await expect(
      useCase.ejecutar({
        ejecutor: {
          id: '2',
          rol: RolUsuario.Docente,
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('debe denegar acceso si no se proporciona ejecutor', async () => {
    await expect(
      useCase.ejecutar({
        pagina: 1,
        limite: 20,
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('debe limitar la paginación a un tope máximo de 100 y mínimo de 1', async () => {
    mockUsuarioRepository.listar.mockResolvedValue({
      usuarios: [],
      total: 0,
      pagina: 1,
      limite: 100,
    });

    await useCase.ejecutar({
      pagina: -5,
      limite: 500,
      ejecutor: {
        id: '100',
        rol: RolUsuario.Administrador,
        alcanceAdministrador: AlcanceAdministrador.General,
      },
    });

    expect(mockUsuarioRepository.listar).toHaveBeenCalledWith({
      rol: undefined,
      sedeId: undefined,
      pagina: 1,
      limite: 100,
    });
  });
});
