import { RegistrarAdministradorSedeUseCase } from './registrar-administrador-sede.use-case';
import {
  Usuario,
  UsuarioRepository,
  Sede,
  SedeRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorAccesoDenegado,
  ErrorValidacion,
  ErrorConflicto,
} from '../dominio';
import { ServicioHash } from './servicio-hash.port';

describe('Caso de Uso: Registrar Administrador de Sede (RF25, HU19, CA-U12)', () => {
  let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;
  let mockSedeRepository: jest.Mocked<SedeRepository>;
  let mockServicioHash: jest.Mocked<ServicioHash>;
  let useCase: RegistrarAdministradorSedeUseCase;

  const ejecutorAdminGeneral = {
    id: 'admin-gen-1',
    rol: RolUsuario.Administrador,
    alcanceAdministrador: AlcanceAdministrador.General,
  };

  const sedeCentral = new Sede({
    id: '1',
    nombre: 'Central',
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

    mockSedeRepository = {
      guardar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorNombre: jest.fn(),
      listarTodas: jest.fn(),
    };

    mockServicioHash = {
      generarHash: jest.fn().mockResolvedValue('hash_seguro_bcrypt'),
      comparar: jest.fn(),
    };

    useCase = new RegistrarAdministradorSedeUseCase(
      mockUsuarioRepository,
      mockSedeRepository,
      mockServicioHash
    );
  });

  it('debe crear un administrador de sede con exito cuando lo ejecuta el admin general', async () => {
    mockUsuarioRepository.buscarPorCorreo.mockResolvedValueOnce(null);
    mockSedeRepository.buscarPorId.mockResolvedValueOnce(sedeCentral);
    mockUsuarioRepository.guardar.mockImplementationOnce(async (u) => u);

    const adminCreado = await useCase.ejecutar({
      nombre: 'Admin Central',
      correo: 'admin.central@sofia.edu',
      passwordInicial: 'clave_admin_123',
      sedeId: '1',
      ejecutor: ejecutorAdminGeneral,
    });

    expect(mockUsuarioRepository.buscarPorCorreo).toHaveBeenCalledWith('admin.central@sofia.edu');
    expect(mockServicioHash.generarHash).toHaveBeenCalledWith('clave_admin_123');
    expect(mockUsuarioRepository.guardar).toHaveBeenCalled();
    expect(adminCreado.rol).toBe(RolUsuario.Administrador);
    expect(adminCreado.alcanceAdministrador).toBe(AlcanceAdministrador.Sede);
    expect(adminCreado.sedeId).toBe('1');
    expect(adminCreado.correo).toBe('admin.central@sofia.edu');
    expect(adminCreado.activo).toBe(true);
  });

  it('debe rechazar con ErrorConflicto si el correo ya esta en uso', async () => {
    mockUsuarioRepository.buscarPorCorreo.mockResolvedValueOnce(
      Usuario.crearPostulante({
        id: 'user-existente',
        nombre: 'Otro Usuario',
        dni: '12345678',
        correo: 'admin.central@sofia.edu',
        passwordHash: 'hash',
        sedeId: '1',
        carrera: 'DERECHO',
      })
    );

    await expect(
      useCase.ejecutar({
        nombre: 'Admin Central',
        correo: 'admin.central@sofia.edu',
        passwordInicial: 'clave_admin_123',
        sedeId: '1',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorConflicto);

    expect(mockUsuarioRepository.guardar).not.toHaveBeenCalled();
  });

  it('debe rechazar con ErrorValidacion si la sede no existe', async () => {
    mockUsuarioRepository.buscarPorCorreo.mockResolvedValueOnce(null);
    mockSedeRepository.buscarPorId.mockResolvedValueOnce(null);
    mockSedeRepository.buscarPorNombre.mockResolvedValueOnce(null);

    await expect(
      useCase.ejecutar({
        nombre: 'Admin Inexistente',
        correo: 'admin.inexistente@sofia.edu',
        passwordInicial: 'clave_admin_123',
        sedeId: '999',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);

    expect(mockUsuarioRepository.guardar).not.toHaveBeenCalled();
  });

  it('debe rechazar con ErrorValidacion si la contrasena inicial es menor a 8 caracteres', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Admin Central',
        correo: 'admin.central@sofia.edu',
        passwordInicial: 'corta',
        sedeId: '1',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('debe rechazar con ErrorValidacion si el formato de correo es invalido', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Admin Central',
        correo: 'correo_invalido_sin_arroba',
        passwordInicial: 'clave_admin_123',
        sedeId: '1',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('debe rechazar con ErrorAccesoDenegado si un administrador de sede intenta crear un administrador', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Admin 2',
        correo: 'admin2@sofia.edu',
        passwordInicial: 'clave_admin_123',
        sedeId: '1',
        ejecutor: {
          id: 'admin-sede-1',
          rol: RolUsuario.Administrador,
          sedeId: '1',
          alcanceAdministrador: AlcanceAdministrador.Sede,
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('debe rechazar con ErrorAccesoDenegado si un postulante o docente intenta crear un administrador', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Admin 2',
        correo: 'admin2@sofia.edu',
        passwordInicial: 'clave_admin_123',
        sedeId: '1',
        ejecutor: {
          id: 'post-1',
          rol: RolUsuario.Postulante,
          sedeId: '1',
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('debe rechazar con ErrorAccesoDenegado si no hay usuario autenticado', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Admin 2',
        correo: 'admin2@sofia.edu',
        passwordInicial: 'clave_admin_123',
        sedeId: '1',
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });
});
