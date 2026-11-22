import { SembradorAdministradorGeneral } from './sembrar-administrador-general';
import { ServicioHash } from './servicio-hash.port';
import { Usuario, UsuarioRepository, RolUsuario, AlcanceAdministrador } from '../dominio';

describe('SembradorAdministradorGeneral (CA-U04, RF25)', () => {
  let usuariosEnMemoria: Usuario[];
  let mockUsuarioRepo: UsuarioRepository;
  let mockServicioHash: ServicioHash;
  let sembrador: SembradorAdministradorGeneral;

  beforeEach(() => {
    usuariosEnMemoria = [];

    mockUsuarioRepo = {
      guardar: jest.fn().mockImplementation(async (usuario: Usuario) => {
        const u = new Usuario({
          id: usuario.id ?? `admin-${usuariosEnMemoria.length + 1}`,
          nombre: usuario.nombre,
          dni: usuario.dni,
          correo: usuario.correo,
          passwordHash: usuario.passwordHash,
          rol: usuario.rol,
          activo: usuario.activo,
          sedeId: usuario.sedeId,
          carrera: usuario.carrera,
          alcanceAdministrador: usuario.alcanceAdministrador,
        });
        usuariosEnMemoria.push(u);
        return u;
      }),
      actualizar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorDni: jest.fn(),
      buscarPorCorreo: jest.fn().mockImplementation(async (correo: string) => {
        return usuariosEnMemoria.find((u) => u.correo === correo) ?? null;
      }),
      existeAdministradorGeneral: jest.fn().mockImplementation(async () => {
        return usuariosEnMemoria.some(
          (u) =>
            u.rol === RolUsuario.Administrador &&
            u.alcanceAdministrador === AlcanceAdministrador.General
        );
      }),
      listar: jest.fn().mockImplementation(async () => [...usuariosEnMemoria]),
    };

    mockServicioHash = {
      generarHash: jest.fn().mockImplementation(async (texto: string) => `hash_${texto}`),
      comparar: jest.fn().mockImplementation(async (texto: string, hash: string) => `hash_${texto}` === hash),
    };

    sembrador = new SembradorAdministradorGeneral(mockUsuarioRepo, mockServicioHash);
  });

  it('(CA-U04) debe crear el administrador general inicial con variables válidas cuando no existe ninguno', async () => {
    const resultado = await sembrador.sembrar({
      nombre: 'Admin Director',
      correo: 'admin@sofia.edu',
      password: 'SuperPassword123!',
    });

    expect(resultado.creado).toBe(true);
    expect(resultado.usuario).toBeDefined();
    expect(resultado.usuario?.nombre).toBe('Admin Director');
    expect(resultado.usuario?.correo).toBe('admin@sofia.edu');
    expect(resultado.usuario?.passwordHash).toBe('hash_SuperPassword123!');
    expect(resultado.usuario?.rol).toBe(RolUsuario.Administrador);
    expect(resultado.usuario?.alcanceAdministrador).toBe(AlcanceAdministrador.General);
    expect(resultado.usuario?.sedeId).toBeNull();
    expect(resultado.usuario?.carrera).toBeNull();
    expect(mockUsuarioRepo.guardar).toHaveBeenCalled();
  });

  it('(CA-U04) no debe crear otro administrador general si ya existe uno', async () => {
    await sembrador.sembrar({
      nombre: 'Admin Original',
      correo: 'admin1@sofia.edu',
      password: 'Password1',
    });

    const resultadoRepetido = await sembrador.sembrar({
      nombre: 'Admin Intruso',
      correo: 'admin2@sofia.edu',
      password: 'Password2',
    });

    expect(resultadoRepetido.creado).toBe(false);
    expect(resultadoRepetido.mensaje).toContain('Ya existe un administrador general');
    expect(usuariosEnMemoria).toHaveLength(1);
    expect(usuariosEnMemoria[0].correo).toBe('admin1@sofia.edu');
  });

  it('(CA-U04) debe fallar con error claro si falta ADMIN_GENERAL_NOMBRE', async () => {
    await expect(
      sembrador.sembrar({
        nombre: '',
        correo: 'admin@sofia.edu',
        password: 'Password123',
      })
    ).rejects.toThrow('Falta la variable de entorno ADMIN_GENERAL_NOMBRE requerida');

    await expect(
      sembrador.sembrar({
        correo: 'admin@sofia.edu',
        password: 'Password123',
      })
    ).rejects.toThrow('Falta la variable de entorno ADMIN_GENERAL_NOMBRE requerida');
  });

  it('(CA-U04) debe fallar con error claro si falta ADMIN_GENERAL_CORREO', async () => {
    await expect(
      sembrador.sembrar({
        nombre: 'Admin',
        correo: '',
        password: 'Password123',
      })
    ).rejects.toThrow('Falta la variable de entorno ADMIN_GENERAL_CORREO requerida');

    await expect(
      sembrador.sembrar({
        nombre: 'Admin',
        password: 'Password123',
      })
    ).rejects.toThrow('Falta la variable de entorno ADMIN_GENERAL_CORREO requerida');
  });

  it('(CA-U04) debe fallar con error claro si falta ADMIN_GENERAL_PASSWORD', async () => {
    await expect(
      sembrador.sembrar({
        nombre: 'Admin',
        correo: 'admin@sofia.edu',
        password: '',
      })
    ).rejects.toThrow('Falta la variable de entorno ADMIN_GENERAL_PASSWORD requerida');

    await expect(
      sembrador.sembrar({
        nombre: 'Admin',
        correo: 'admin@sofia.edu',
      })
    ).rejects.toThrow('Falta la variable de entorno ADMIN_GENERAL_PASSWORD requerida');
  });
});
