import { IniciarSesionUseCase } from './iniciar-sesion.use-case';
import { ServicioHash } from './servicio-hash.port';
import { ServicioToken, PayloadToken } from './servicio-token.port';
import { Usuario, UsuarioRepository, RolUsuario, AlcanceAdministrador, ErrorAutenticacion } from '../dominio';

describe('IniciarSesionUseCase (CA-U05, ADR-007, HU20, RF20)', () => {
  let usuariosEnMemoria: Usuario[];
  let mockUsuarioRepo: UsuarioRepository;
  let mockServicioHash: ServicioHash;
  let mockServicioToken: ServicioToken;
  let useCase: IniciarSesionUseCase;

  beforeEach(() => {
    usuariosEnMemoria = [
      Usuario.crearPostulante({
        id: 'post-1',
        nombre: 'Estudiante Activo',
        dni: '71112222',
        correo: '71112222@sofia.edu',
        passwordHash: 'hash_71112222',
        sedeId: 'sede-hana',
        carrera: 'MEDICINA',
        activo: true,
      }),
      new Usuario({
        id: 'post-desactivado',
        nombre: 'Estudiante Inactivo',
        dni: '73334444',
        correo: '73334444@sofia.edu',
        passwordHash: 'hash_73334444',
        rol: RolUsuario.Postulante,
        sedeId: 'sede-hana',
        carrera: 'DERECHO',
        activo: false,
      }),
      Usuario.crearAdministradorGeneral({
        id: 'admin-1',
        nombre: 'Admin General',
        correo: 'admin@sofia.edu',
        passwordHash: 'hash_admin123',
        activo: true,
      }),
    ];

    mockUsuarioRepo = {
      guardar: jest.fn(),
      actualizar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorDni: jest.fn(),
      buscarPorCorreo: jest.fn().mockImplementation(async (correo: string) => {
        return usuariosEnMemoria.find((u) => u.correo.toLowerCase() === correo.trim().toLowerCase()) ?? null;
      }),
      existeAdministradorGeneral: jest.fn(),
      listar: jest.fn(),
    };

    mockServicioHash = {
      generarHash: jest.fn().mockImplementation(async (texto: string) => `hash_${texto}`),
      comparar: jest.fn().mockImplementation(async (texto: string, hash: string) => `hash_${texto}` === hash),
    };

    mockServicioToken = {
      generarToken: jest.fn().mockImplementation(async (payload: PayloadToken) => `jwt_${payload.id}_${payload.rol}`),
      verificarToken: jest.fn(),
    };

    useCase = new IniciarSesionUseCase(mockUsuarioRepo, mockServicioHash, mockServicioToken);
  });

  it('(CA-U05) debe permitir iniciar sesión a un usuario activo con credenciales correctas y emitir JWT', async () => {
    const resultado = await useCase.ejecutar({
      correo: '71112222@sofia.edu',
      password: '71112222',
    });

    expect(resultado.token).toBe('jwt_post-1_POSTULANTE');
    expect(resultado.usuario).toEqual({
      id: 'post-1',
      nombre: 'Estudiante Activo',
      correo: '71112222@sofia.edu',
      rol: RolUsuario.Postulante,
      sedeId: 'sede-hana',
    });
    expect(mockServicioToken.generarToken).toHaveBeenCalledWith({
      id: 'post-1',
      rol: RolUsuario.Postulante,
      sedeId: 'sede-hana',
    });
    expect(resultado.cambioPasswordRequerido).toBeUndefined();
  });

  it('solicita cambio solo a credenciales provisionales pendientes', async () => {
    const provisional = new Usuario({
      id: 'post-prov', nombre: 'Estudiante Sintético', dni: '72223334', correo: '72223334@sofia.edu',
      passwordHash: 'hash_credencial', rol: RolUsuario.Postulante, sedeId: 'sede-hana', carrera: 'MEDICINA',
      passwordProvisionalHasta: new Date(Date.now() + 60_000), passwordCambioObligatorio: true,
    });
    usuariosEnMemoria.push(provisional);
    const resultado = await useCase.ejecutar({ correo: provisional.correo, password: 'credencial' });
    expect(resultado.cambioPasswordRequerido).toBe(true);
  });

  it('(CA-U05) debe permitir iniciar sesión al administrador general sin sede', async () => {
    const resultado = await useCase.ejecutar({
      correo: 'admin@sofia.edu',
      password: 'admin123',
    });

    expect(resultado.token).toBe('jwt_admin-1_ADMINISTRADOR');
    expect(resultado.usuario.sedeId).toBeNull();
  });

  it('(CA-U05) debe rechazar credenciales incorrectas con error genérico', async () => {
    await expect(
      useCase.ejecutar({
        correo: '71112222@sofia.edu',
        password: 'clave_incorrecta',
      })
    ).rejects.toThrow(ErrorAutenticacion);

    await expect(
      useCase.ejecutar({
        correo: '71112222@sofia.edu',
        password: 'clave_incorrecta',
      })
    ).rejects.toThrow('Credenciales invalidas.');
  });

  it('(CA-U05) debe rechazar usuario inexistente con el mismo error genérico', async () => {
    await expect(
      useCase.ejecutar({
        correo: 'inexistente@sofia.edu',
        password: 'cualquier_clave',
      })
    ).rejects.toThrow(ErrorAutenticacion);

    await expect(
      useCase.ejecutar({
        correo: 'inexistente@sofia.edu',
        password: 'cualquier_clave',
      })
    ).rejects.toThrow('Credenciales invalidas.');
  });

  it('(CA-U05) debe rechazar usuario desactivado con el mismo error genérico', async () => {
    await expect(
      useCase.ejecutar({
        correo: '73334444@sofia.edu',
        password: '73334444',
      })
    ).rejects.toThrow(ErrorAutenticacion);

    await expect(
      useCase.ejecutar({
        correo: '73334444@sofia.edu',
        password: '73334444',
      })
    ).rejects.toThrow('Credenciales invalidas.');
  });

  it('(CA-U05) debe rechazar si correo o password están vacíos', async () => {
    await expect(
      useCase.ejecutar({
        correo: '',
        password: 'pass',
      })
    ).rejects.toThrow(ErrorAutenticacion);

    await expect(
      useCase.ejecutar({
        correo: 'admin@sofia.edu',
        password: '   ',
      })
    ).rejects.toThrow(ErrorAutenticacion);
  });
});
