import { RegistrarEstudianteUseCase } from './registrar-estudiante.use-case';
import { RegistrarEstudianteCommand } from './registrar-estudiante.command';
import { GeneradorCredenciales } from './generar-credenciales';
import { ServicioHash } from './servicio-hash.port';
import {
  Usuario,
  UsuarioRepository,
  SedeRepository,
  Sede,
  RolUsuario,
  AlcanceAdministrador,
  ErrorValidacion,
  ErrorConflicto,
  ErrorAccesoDenegado,
  ErrorNoAutenticado,
} from '../dominio';

describe('RegistrarEstudianteUseCase (CA-U01, RF01, RF22, HU01)', () => {
  let usuariosEnMemoria: Usuario[];
  let sedesEnMemoria: Sede[];
  let mockUsuarioRepo: UsuarioRepository;
  let mockSedeRepo: SedeRepository;
  let mockServicioHash: ServicioHash;
  let generadorCredenciales: GeneradorCredenciales;
  let useCase: RegistrarEstudianteUseCase;

  beforeEach(() => {
    usuariosEnMemoria = [];
    sedesEnMemoria = [
      new Sede({ id: 'sede-uuid-hana', nombre: 'Hana' }),
      new Sede({ id: 'sede-uuid-urin', nombre: 'Urin' }),
      new Sede({ id: 'sede-uuid-central', nombre: 'Central' }),
    ];

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
      actualizar: jest.fn().mockImplementation(async (usuario: Usuario) => {
        const idx = usuariosEnMemoria.findIndex((u) => u.id === usuario.id);
        if (idx >= 0) usuariosEnMemoria[idx] = usuario;
      }),
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

    mockSedeRepo = {
      guardar: jest.fn().mockImplementation(async (s: Sede) => {
        sedesEnMemoria.push(s);
        return s;
      }),
      buscarPorId: jest.fn().mockImplementation(async (id: string) => {
        return sedesEnMemoria.find((s) => s.id === id) ?? null;
      }),
      buscarPorNombre: jest.fn().mockImplementation(async (nombre: string) => {
        return (
          sedesEnMemoria.find(
            (s) => s.nombre.toLowerCase() === nombre.trim().toLowerCase()
          ) ?? null
        );
      }),
      listarTodas: jest.fn().mockImplementation(async () => [...sedesEnMemoria]),
    };

    mockServicioHash = {
      generarHash: jest.fn().mockImplementation(async (texto: string) => `hash_${texto}`),
      comparar: jest.fn().mockImplementation(async (texto: string, hash: string) => `hash_${texto}` === hash),
    };

    generadorCredenciales = new GeneradorCredenciales(mockServicioHash);
    useCase = new RegistrarEstudianteUseCase(mockUsuarioRepo, mockSedeRepo, generadorCredenciales);
  });

  const ejecutorAdminGeneral = {
    id: 'admin-gen-1',
    rol: RolUsuario.Administrador,
    alcanceAdministrador: AlcanceAdministrador.General,
  };

  const ejecutorAdminSedeHana = {
    id: 'admin-sede-1',
    rol: RolUsuario.Administrador,
    sedeId: 'sede-uuid-hana',
    alcanceAdministrador: AlcanceAdministrador.Sede,
  };

  it('(CA-U01) debe permitir que el administrador general registre un estudiante en cualquier sede', async () => {
    const cmd: RegistrarEstudianteCommand = {
      nombre: 'Carlos Alumno',
      dni: '71234567',
      sedeId: 'sede-uuid-hana',
      carrera: '  ingenieria de sistemas  ',
      ejecutor: ejecutorAdminGeneral,
    };

    const estudiante = await useCase.ejecutar(cmd);

    expect(estudiante.id).toBeDefined();
    expect(estudiante.nombre).toBe('Carlos Alumno');
    expect(estudiante.dni).toBe('71234567');
    expect(estudiante.correo).toBe('71234567@sofia.edu');
    expect(estudiante.passwordHash).toBe('hash_71234567');
    expect(estudiante.rol).toBe(RolUsuario.Postulante);
    expect(estudiante.sedeId).toBe('sede-uuid-hana');
    expect(estudiante.carrera).toBe('INGENIERIA DE SISTEMAS');
    expect(estudiante.condicion).toBeNull();
    expect(estudiante.activo).toBe(true);
    expect(mockUsuarioRepo.guardar).toHaveBeenCalled();
  });

  it('la ruta automática de registro individual requiere un ciclo y devuelve el resultado clasificado', async () => {
    const emision = { administradorId: 'admin-gen-1', referencia: 'ref-sintetica', passwordHash: 'hash-temporal' };
    const clasificar = jest.fn(async (_ciclo, _datos, _actor, emitirCredenciales) => {
      await emitirCredenciales();
      return {
      usuario: Usuario.crearPostulante({ nombre: 'Ana Sintética', dni: '71234567', correo: '71234567@sofia.edu',
        passwordHash: 'hash-temporal', sedeId: 'sede-uuid-hana', carrera: 'MEDICINA' }),
      resultado: 'creada' as const,
      };
    });
    const emitir = jest.fn().mockResolvedValue(emision);
    const casoAutomatico = new RegistrarEstudianteUseCase(
      mockUsuarioRepo, mockSedeRepo, generadorCredenciales, emitir, undefined, clasificar,
    );
    await expect(casoAutomatico.ejecutar({
      nombre: 'Ana Sintética', dni: '71234567', sedeId: 'sede-uuid-hana', carrera: 'Medicina',
      cicloId: '12345678-1234-1234-1234-123456789012', modoAutomatico: true, ejecutor: ejecutorAdminGeneral,
    }, undefined, resultado => expect(resultado).toBe('creada'))).resolves.toMatchObject({ dni: '71234567' });
    expect(emitir).toHaveBeenCalledTimes(1);
    expect(clasificar).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ dni: '71234567' }),
      ejecutorAdminGeneral, expect.any(Function));
    await expect(casoAutomatico.ejecutar({
      nombre: 'Ana Sintética', dni: '71234567', sedeId: 'sede-uuid-hana', carrera: 'Medicina',
      modoAutomatico: true, ejecutor: ejecutorAdminGeneral,
    })).rejects.toThrow('Selecciona un ciclo académico abierto');
  });

  it('(CA-U01) debe permitir registrar estudiante indicando el nombre de la sede', async () => {
    const cmd: RegistrarEstudianteCommand = {
      nombre: 'Lucia Gomez',
      dni: '72345678',
      sedeId: 'Urin',
      carrera: 'Derecho', condicion: 'LIBRE',
      ejecutor: ejecutorAdminGeneral,
    };

    const estudiante = await useCase.ejecutar(cmd);
    expect(estudiante.sedeId).toBe('sede-uuid-urin');
    expect(estudiante.carrera).toBe('DERECHO');
  });

  it('(CA-U01) debe permitir que un administrador de sede registre un estudiante de su misma sede', async () => {
    const cmd: RegistrarEstudianteCommand = {
      nombre: 'Ana Perez',
      dni: '81234567',
      sedeId: 'sede-uuid-hana',
      carrera: 'Medicina', condicion: 'LIBRE',
      ejecutor: ejecutorAdminSedeHana,
    };

    const estudiante = await useCase.ejecutar(cmd);
    expect(estudiante.nombre).toBe('Ana Perez');
    expect(estudiante.sedeId).toBe('sede-uuid-hana');
  });

  it('(CA-U01) debe responder con acceso denegado si un administrador de sede intenta registrar en otra sede', async () => {
    const cmd: RegistrarEstudianteCommand = {
      nombre: 'Mario Vargas',
      dni: '82345678',
      sedeId: 'sede-uuid-urin',
      carrera: 'Medicina', condicion: 'LIBRE',
      ejecutor: ejecutorAdminSedeHana,
    };

    await expect(useCase.ejecutar(cmd)).rejects.toThrow(ErrorAccesoDenegado);
    await expect(useCase.ejecutar(cmd)).rejects.toThrow(
      'Acceso denegado: el administrador de sede solo puede registrar estudiantes en su sede.'
    );
  });

  it('(CA-U01) debe rechazar el registro con error de conflicto si el DNI ya existe', async () => {
    await useCase.ejecutar({
      nombre: 'Primer Estudiante',
      dni: '77778888',
      sedeId: 'sede-uuid-hana',
      carrera: 'Educacion', condicion: 'LIBRE',
      ejecutor: ejecutorAdminGeneral,
    });

    const intentoDuplicado: RegistrarEstudianteCommand = {
      nombre: 'Segundo Estudiante',
      dni: '77778888',
      sedeId: 'sede-uuid-central',
      carrera: 'Derecho', condicion: 'LIBRE',
      ejecutor: ejecutorAdminGeneral,
    };

    await expect(useCase.ejecutar(intentoDuplicado)).rejects.toThrow(ErrorConflicto);
    await expect(useCase.ejecutar(intentoDuplicado)).rejects.toThrow(
      'El DNI ya se encuentra registrado.'
    );
  });

  it('(CA-U01) debe rechazar con error de validación si el DNI no tiene 8 dígitos numéricos', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Estudiante',
        dni: '1234567',
        sedeId: 'sede-uuid-hana',
        carrera: 'Medicina', condicion: 'LIBRE',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);

    await expect(
      useCase.ejecutar({
        nombre: 'Estudiante',
        dni: '123456789',
        sedeId: 'sede-uuid-hana',
        carrera: 'Medicina', condicion: 'LIBRE',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);

    await expect(
      useCase.ejecutar({
        nombre: 'Estudiante',
        dni: '1234ABCD',
        sedeId: 'sede-uuid-hana',
        carrera: 'Medicina', condicion: 'LIBRE',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('(CA-U01) debe rechazar con error de validación si el nombre o la carrera están vacíos', async () => {
    await expect(
      useCase.ejecutar({
        nombre: '   ',
        dni: '70000001',
        sedeId: 'sede-uuid-hana',
        carrera: 'Medicina', condicion: 'LIBRE',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);

    await expect(
      useCase.ejecutar({
        nombre: 'Estudiante',
        dni: '70000002',
        sedeId: 'sede-uuid-hana',
        carrera: '   ',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('(CA-U01) debe rechazar con error de validación si la sede indicada no existe', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Estudiante',
        dni: '70000003',
        sedeId: 'sede-fantasma',
        carrera: 'Medicina', condicion: 'LIBRE',
        ejecutor: ejecutorAdminGeneral,
      })
    ).rejects.toThrow(ErrorValidacion);
  });

  it('(CA-U01) debe rechazar con acceso denegado si un postulante o docente intenta registrar', async () => {
    const ejecutorPostulante = {
      id: 'post-1',
      rol: RolUsuario.Postulante,
      sedeId: 'sede-uuid-hana',
    };

    const ejecutorDocente = {
      id: 'doc-1',
      rol: RolUsuario.Docente,
    };

    await expect(
      useCase.ejecutar({
        nombre: 'Nuevo',
        dni: '70000004',
        sedeId: 'sede-uuid-hana',
        carrera: 'Medicina', condicion: 'LIBRE',
        ejecutor: ejecutorPostulante,
      })
    ).rejects.toThrow(ErrorAccesoDenegado);

    await expect(
      useCase.ejecutar({
        nombre: 'Nuevo',
        dni: '70000005',
        sedeId: 'sede-uuid-hana',
        carrera: 'Medicina', condicion: 'LIBRE',
        ejecutor: ejecutorDocente,
      })
    ).rejects.toThrow(ErrorAccesoDenegado);
  });

  it('(CA-U01) debe rechazar con acceso no autorizado si no hay ejecutor autenticado', async () => {
    await expect(
      useCase.ejecutar({
        nombre: 'Nuevo',
        dni: '70000006',
        sedeId: 'sede-uuid-hana',
        carrera: 'Medicina', condicion: 'LIBRE',
      })
    ).rejects.toThrow(ErrorNoAutenticado);
  });
});
