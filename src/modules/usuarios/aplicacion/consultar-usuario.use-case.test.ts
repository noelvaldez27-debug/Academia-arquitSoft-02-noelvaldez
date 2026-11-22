import { ConsultarUsuarioUseCase } from './consultar-usuario.use-case';
import {
  Usuario,
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
} from '../dominio';

describe('Caso de Uso: Consultar Usuario por Identificador (CA-U07, AC04)', () => {
  let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;
  let useCase: ConsultarUsuarioUseCase;

  const postulante = Usuario.crearPostulante({
    id: 'user-post-1',
    nombre: 'Maria Flores',
    dni: '77889900',
    correo: '77889900@sofia.edu',
    passwordHash: 'hash_super_secreto',
    sedeId: '1',
    carrera: 'ENFERMERIA',
    activo: true,
  });

  const adminSede = Usuario.crearAdministradorSede({
    id: 'user-admin-1',
    nombre: 'Admin Hana',
    correo: 'admin.hana@sofia.edu',
    passwordHash: 'hash_admin_secreto',
    sedeId: '1',
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

    useCase = new ConsultarUsuarioUseCase(mockUsuarioRepository);
  });

  it('debe retornar datos del postulante incluyendo sede y carrera, sin contrasena ni hash', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(postulante);

    const resultado = await useCase.consultarPorId('user-post-1');

    expect(mockUsuarioRepository.buscarPorId).toHaveBeenCalledWith('user-post-1');
    expect(resultado).not.toBeNull();
    expect(resultado?.id).toBe('user-post-1');
    expect(resultado?.nombre).toBe('Maria Flores');
    expect(resultado?.dni).toBe('77889900');
    expect(resultado?.correo).toBe('77889900@sofia.edu');
    expect(resultado?.rol).toBe(RolUsuario.Postulante);
    expect(resultado?.sedeId).toBe('1');
    expect(resultado?.carrera).toBe('ENFERMERIA');
    expect(resultado?.activo).toBe(true);

    // Garantizar que nunca incluya contraseñas ni hashes (AC04, CA-U07)
    expect((resultado as any).password).toBeUndefined();
    expect((resultado as any).passwordHash).toBeUndefined();
  });

  it('debe retornar datos del administrador con su alcance de sede', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(adminSede);

    const resultado = await useCase.consultarPorId('user-admin-1');

    expect(resultado).not.toBeNull();
    expect(resultado?.rol).toBe(RolUsuario.Administrador);
    expect(resultado?.alcanceAdministrador).toBe(AlcanceAdministrador.Sede);
    expect(resultado?.sedeId).toBe('1');
    expect((resultado as any).passwordHash).toBeUndefined();
  });

  it('debe retornar null si el usuario no existe', async () => {
    mockUsuarioRepository.buscarPorId.mockResolvedValueOnce(null);

    const resultado = await useCase.consultarPorId('no-existe');

    expect(resultado).toBeNull();
  });

  it('debe retornar null si el identificador proporcionado es vacio', async () => {
    const resultadoVacio = await useCase.consultarPorId('   ');
    expect(resultadoVacio).toBeNull();
    expect(mockUsuarioRepository.buscarPorId).not.toHaveBeenCalled();
  });
});
