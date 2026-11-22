import { RegistrarDocenteUseCase } from './registrar-docente.use-case';
import { RegistrarDocenteCommand } from './registrar-docente.command';
import { GeneradorCredenciales } from './generar-credenciales';
import { ServicioHash } from './servicio-hash.port';
import {
  Usuario,
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorValidacion,
  ErrorConflicto,
  ErrorAccesoDenegado,
  ErrorNoAutenticado,
} from '../dominio';

describe('RegistrarDocenteUseCase (CA-U03, RF19, HU14)', () => {
  let usuariosEnMemoria: Usuario[];
  let mockUsuarioRepo: UsuarioRepository;
  let mockServicioHash: ServicioHash;
  let generadorCredenciales: GeneradorCredenciales;
  let useCase: RegistrarDocenteUseCase;

  beforeEach(() => {
    usuariosEnMemoria = [];

    mockUsuarioRepo = {
      guardar: jest.fn().mockImplementation(async (usuario: Usuario) => {
        const u = new Usuario({
          id: usuario.id ?? `user-${usuariosEnMemoria.length + 1}`,
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
      buscarPorId: jest.fn().mockImplementation(async (id: string) => {
        return usuariosEnMemoria.find((u) => u.id === id) ?? null;
      }),
      buscarPorDni: jest.fn().mockImplementation(async (dni: string) => {
        return usuariosEnMemoria.find((u) => u.dni === dni) ?? null;
      }),
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

    generadorCredenciales = new GeneradorCredenciales(mockServicioHash);
    useCase = new RegistrarDocenteUseCase(mockUsuarioRepo, generadorCredenciales);
  });

  const ejecutorAdminGeneral = {
    id: 'admin-gen-1',
    rol: RolUsuario.Administrador,
    alcanceAdministrador: AlcanceAdministrador.General,
  };

  it('(CA-U03) debe permitir que el administrador general registre un docente válido', async () => {
    const cmd: RegistrarDocenteCommand = {
      nombre: 'Profesor Ricardo Palma',
      dni: '10203040',
      ejecutor: ejecutorAdminGeneral,
    };

    const docente = await useCase.ejecutar(cmd);

    expect(docente.id).toBeDefined();
    expect(docente.nombre).toBe('Profesor Ricardo Palma');
    expect(docente.dni).toBe('10203040');
    expect(docente.correo).toBe('10203040@sofia.edu');
    expect(docente.passwordHash).toBe('hash_10203040');
    expect(docente.rol).toBe(RolUsuario.Docente);
    expect(docente.sedeId).toBeNull();
    expect(docente.carrera).toBeNull();
    expect(docente.activo).toBe(true);
    expect(mockUsuarioRepo.guardar).toHaveBeenCalled();
  });

  it('(CA-U03) debe rechazar el registro con acceso denegado si lo ejecuta un administrador de sede', async () => {
    const cmd: RegistrarDocenteCommand = {
      nombre: 'Docente Prueba',
      dni: '10203041',
      ejecutor: {
        id: 'admin-sede-1',
        rol: RolUsuario.Administrador,
        sedeId: 'sede-hana',
        alcanceAdministrador: AlcanceAdministrador.Sede,
      },
    };

    await expect(useCase.ejecutar(cmd)).rejects.toThrow(ErrorAccesoDenegado);
    await expect(useCase.ejecutar(cmd)).rejects.toThrow(
      'Acceso denegado: solo el administrador general puede registrar docentes.'
    );
  });

  it('(CA-U03) debe rechazar el registro con acceso denegado si lo ejecuta un docente o postulante', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Docente Dos',
        dni: '10203042',
        ejecutor: {
          id: 'doc-1',
          rol: RolUsuario.Docente,
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);

    await expect(
      useCase.ejecutar({
        nombre: 'Docente Tres',
        dni: '10203043',
        ejecutor: {
          id: 'post-1',
          rol: RolUsuario.Postulante,
          sedeId: 'sede-1',
        },
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('(CA-U03) debe rechazar el registro con conflicto si el DNI ya existe', async () => {
    await useCase.ejecutar({
      nombre: 'Docente Original',
      dni: '20304050',
      ejecutor: ejecutorAdminGeneral,
    });

    await expect(
      useCase.ejecutar({
        nombre: 'Docente Repetido',
        dni: '20304050',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorConflicto);
    await expect(
      useCase.ejecutar({
        nombre: 'Docente Repetido',
        dni: '20304050',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow('El DNI ya se encuentra registrado.');
  });

  it('(CA-U03) debe rechazar con error de validación si el DNI no tiene 8 dígitos numéricos', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Docente',
        dni: '12345',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);

    await expect(
      useCase.ejecutar({
        nombre: 'Docente',
        dni: '123456789',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);

    await expect(
      useCase.ejecutar({
        nombre: 'Docente',
        dni: '1234567X',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('(CA-U03) debe rechazar con error de validación si el nombre está vacío', async () => {
    await expect(
      useCase.ejecutar({
        nombre: '   ',
        dni: '30405060',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('(CA-U03) debe rechazar con acceso no autorizado si no hay ejecutor en la petición', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Docente Sin Sesion',
        dni: '30405061',
      })
    ).rejects.toThrow(ErrorNoAutenticado);
  });
});
