import { CambiarPasswordUseCase } from './cambiar-password.use-case';
import { Usuario, RolUsuario, ErrorValidacion, ErrorAutenticacion } from '../dominio';
import { UsuarioRepository } from '../dominio/usuario-repository';
import { ServicioHash } from './servicio-hash.port';

describe('CambiarPasswordUseCase (HU21, RF26, CA-U08)', () => {
  let usuarioRepoMock: jest.Mocked<UsuarioRepository>;
  let servicioHashMock: jest.Mocked<ServicioHash>;
  let useCase: CambiarPasswordUseCase;

  const mockUsuario = Usuario.crearPostulante({
    id: '1',
    nombre: 'Juan Perez',
    dni: '12345678',
    correo: '12345678@sofia.edu',
    passwordHash: 'hash_antiguo',
    sedeId: '1',
    carrera: 'MEDICINA',
    activo: true,
  });

  beforeEach(() => {
    usuarioRepoMock = {
      guardar: jest.fn(),
      actualizar: jest.fn().mockResolvedValue(undefined),
      buscarPorId: jest.fn().mockResolvedValue(mockUsuario),
      buscarPorDni: jest.fn(),
      buscarPorCorreo: jest.fn(),
      existeAdministradorGeneral: jest.fn(),
      listar: jest.fn(),
    };

    servicioHashMock = {
      generarHash: jest.fn().mockResolvedValue('hash_nuevo_123'),
      comparar: jest.fn().mockResolvedValue(true),
    };

    useCase = new CambiarPasswordUseCase(usuarioRepoMock, servicioHashMock);
  });

  it('debe cambiar la contrasena exitosamente con contrasena actual correcta y nueva valida', async () => {
    await useCase.ejecutar({
      usuarioId: '1',
      passwordActual: '12345678',
      passwordNueva: 'nueva_clave_segura_123',
    });

    expect(usuarioRepoMock.buscarPorId).toHaveBeenCalledWith('1');
    expect(servicioHashMock.comparar).toHaveBeenCalledWith('12345678', 'hash_antiguo');
    expect(servicioHashMock.generarHash).toHaveBeenCalledWith('nueva_clave_segura_123');
    expect(usuarioRepoMock.actualizar).toHaveBeenCalled();
  });

  it('debe lanzar ErrorValidacion si la contrasena actual esta vacia', async () => {
    await expect(
      useCase.ejecutar({
        usuarioId: '1',
        passwordActual: '',
        passwordNueva: 'nueva_clave_segura_123',
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('debe lanzar ErrorValidacion si la nueva contrasena tiene menos de 8 caracteres', async () => {
    await expect(
      useCase.ejecutar({
        usuarioId: '1',
        passwordActual: '12345678',
        passwordNueva: 'corta',
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('debe lanzar ErrorAutenticacion si la contrasena actual es incorrecta', async () => {
    servicioHashMock.comparar.mockResolvedValueOnce(false);

    await expect(
      useCase.ejecutar({
        usuarioId: '1',
        passwordActual: 'clave_erronea',
        passwordNueva: 'nueva_clave_segura_123',
      })
    ).rejects.toThrow(ErrorAutenticacion);

    expect(servicioHashMock.generarHash).not.toHaveBeenCalled();
    expect(usuarioRepoMock.actualizar).not.toHaveBeenCalled();
  });

  it('debe lanzar ErrorAutenticacion si el usuario no existe o esta inactivo', async () => {
    usuarioRepoMock.buscarPorId.mockResolvedValueOnce(null);

    await expect(
      useCase.ejecutar({
        usuarioId: '99',
        passwordActual: '12345678',
        passwordNueva: 'nueva_clave_segura_123',
      })
    ).rejects.toThrow(ErrorAutenticacion);
  });

  it('debe lanzar ErrorAutenticacion si usuarioId esta vacio', async () => {
    await expect(
      useCase.ejecutar({
        usuarioId: '',
        passwordActual: '12345678',
        passwordNueva: 'nueva_clave_segura_123',
      })
    ).rejects.toThrow(ErrorAutenticacion);
  });
});
