import { CambiarCorreoUseCase } from './cambiar-correo.use-case';
import { Usuario, RolUsuario, ErrorValidacion, ErrorConflicto, ErrorAutenticacion, ErrorAccesoDenegado } from '../dominio';
import { UsuarioRepository } from '../dominio/usuario-repository';
import { ServicioHash } from './servicio-hash.port';

describe('CambiarCorreoUseCase (HU22, RF26, CA-U09)', () => {
  let usuarioRepoMock: jest.Mocked<UsuarioRepository>;
  let servicioHashMock: jest.Mocked<ServicioHash>;
  let useCase: CambiarCorreoUseCase;

  const mockAdminGeneral = Usuario.crearAdministradorGeneral({
    id: '10',
    nombre: 'Admin General',
    correo: 'admin@sofia.edu',
    passwordHash: 'hash_admin',
    activo: true,
  });

  const mockAdminSede = Usuario.crearAdministradorSede({
    id: '11',
    nombre: 'Admin Sede Hana',
    correo: 'sede.hana@sofia.edu',
    passwordHash: 'hash_sede',
    sedeId: '1',
    activo: true,
  });

  const mockPostulante = Usuario.crearPostulante({
    id: '20',
    nombre: 'Postulante Test',
    dni: '99887766',
    correo: '99887766@sofia.edu',
    passwordHash: 'hash_post',
    sedeId: '1',
    carrera: 'MEDICINA',
    activo: true,
  });

  beforeEach(() => {
    usuarioRepoMock = {
      guardar: jest.fn(),
      actualizar: jest.fn().mockResolvedValue(undefined),
      buscarPorId: jest.fn(),
      buscarPorDni: jest.fn(),
      buscarPorCorreo: jest.fn().mockResolvedValue(null),
      existeAdministradorGeneral: jest.fn(),
      listar: jest.fn(),
    };

    servicioHashMock = {
      generarHash: jest.fn(),
      comparar: jest.fn().mockResolvedValue(true),
    };

    useCase = new CambiarCorreoUseCase(usuarioRepoMock, servicioHashMock);
  });

  it('debe cambiar el correo del administrador general exitosamente', async () => {
    usuarioRepoMock.buscarPorId.mockResolvedValueOnce(mockAdminGeneral);

    await useCase.ejecutar({
      usuarioId: '10',
      nuevoCorreo: 'nuevo.admin@sofia.edu',
      passwordActual: 'clave_correcta',
    });

    expect(servicioHashMock.comparar).toHaveBeenCalledWith('clave_correcta', 'hash_admin');
    expect(usuarioRepoMock.buscarPorCorreo).toHaveBeenCalledWith('nuevo.admin@sofia.edu');
    expect(usuarioRepoMock.actualizar).toHaveBeenCalled();
  });

  it('debe cambiar el correo del administrador de sede exitosamente', async () => {
    usuarioRepoMock.buscarPorId.mockResolvedValueOnce(mockAdminSede);

    await useCase.ejecutar({
      usuarioId: '11',
      nuevoCorreo: 'nuevo.sede@sofia.edu',
      passwordActual: 'clave_correcta',
    });

    expect(usuarioRepoMock.actualizar).toHaveBeenCalled();
  });

  it('debe lanzar ErrorAccesoDenegado si un postulante intenta cambiar su correo', async () => {
    usuarioRepoMock.buscarPorId.mockResolvedValueOnce(mockPostulante);

    await expect(
      useCase.ejecutar({
        usuarioId: '20',
        nuevoCorreo: 'nuevo@sofia.edu',
        passwordActual: 'clave',
      })
    ).rejects.toThrow(ErrorAccesoDenegado);

    expect(usuarioRepoMock.actualizar).not.toHaveBeenCalled();
  });

  it('debe lanzar ErrorConflicto si el correo ya existe en otro usuario', async () => {
    usuarioRepoMock.buscarPorId.mockResolvedValueOnce(mockAdminGeneral);
    usuarioRepoMock.buscarPorCorreo.mockResolvedValueOnce(
      Usuario.crearAdministradorSede({
        id: '99',
        nombre: 'Otro admin',
        correo: 'ocupado@sofia.edu',
        passwordHash: 'hash',
        sedeId: '2',
      })
    );

    await expect(
      useCase.ejecutar({
        usuarioId: '10',
        nuevoCorreo: 'ocupado@sofia.edu',
        passwordActual: 'clave_correcta',
      })
    ).rejects.toThrow(ErrorConflicto);
  });

  it('debe lanzar ErrorAutenticacion si la contrasena actual es incorrecta', async () => {
    usuarioRepoMock.buscarPorId.mockResolvedValueOnce(mockAdminGeneral);
    servicioHashMock.comparar.mockResolvedValueOnce(false);

    await expect(
      useCase.ejecutar({
        usuarioId: '10',
        nuevoCorreo: 'nuevo@sofia.edu',
        passwordActual: 'clave_erronea',
      })
    ).rejects.toThrow(ErrorAutenticacion);

    expect(usuarioRepoMock.actualizar).not.toHaveBeenCalled();
  });

  it('debe lanzar ErrorValidacion si el correo tiene formato invalido', async () => {
    await expect(
      useCase.ejecutar({
        usuarioId: '10',
        nuevoCorreo: 'no-es-un-correo',
        passwordActual: 'clave',
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('debe lanzar ErrorValidacion si la contrasena actual esta vacia', async () => {
    await expect(
      useCase.ejecutar({
        usuarioId: '10',
        nuevoCorreo: 'nuevo@sofia.edu',
        passwordActual: '',
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('debe lanzar ErrorAutenticacion si el usuario no existe', async () => {
    usuarioRepoMock.buscarPorId.mockResolvedValueOnce(null);

    await expect(
      useCase.ejecutar({
        usuarioId: '999',
        nuevoCorreo: 'nuevo@sofia.edu',
        passwordActual: 'clave',
      })
    ).rejects.toThrow(ErrorAutenticacion);
  });

  it('no debe lanzar ErrorConflicto si el correo nuevo es el mismo del propio usuario', async () => {
    usuarioRepoMock.buscarPorId.mockResolvedValueOnce(mockAdminGeneral);
    // buscarPorCorreo retorna el mismo usuario (mismo id)
    usuarioRepoMock.buscarPorCorreo.mockResolvedValueOnce(mockAdminGeneral);

    await expect(
      useCase.ejecutar({
        usuarioId: '10',
        nuevoCorreo: 'admin@sofia.edu',
        passwordActual: 'clave_correcta',
      })
    ).resolves.not.toThrow();
  });
});
