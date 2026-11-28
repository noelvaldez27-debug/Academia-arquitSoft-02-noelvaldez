import { Pool } from 'pg';
import { PostgresUsuarioRepository } from './postgres-usuario-repository';
import { Usuario, RolUsuario, AlcanceAdministrador } from '../dominio';

describe('PostgresUsuarioRepository (Pool simulado)', () => {
  let mockPool: Partial<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };
  });

  it('debe guardar un postulante con sede y carrera', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 10,
          nombre: 'Juan Alumno',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          password_hash: 'hash_123',
          rol: 'POSTULANTE',
          activo: true,
          sede_id: 1,
          carrera: 'MEDICINA',
          alcance_administrador: null,
        },
      ],
    });

    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    const postulante = Usuario.crearPostulante({
      nombre: 'Juan Alumno',
      dni: '12345678',
      correo: '12345678@sofia.edu',
      passwordHash: 'hash_123',
      sedeId: '1',
      carrera: 'MEDICINA',
    });

    const guardado = await repo.guardar(postulante);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO usuarios'),
      [
        'Juan Alumno',
        '12345678',
        '12345678@sofia.edu',
        'hash_123',
        RolUsuario.Postulante,
        true,
        1,
        'MEDICINA',
        null,
        null,
      ]
    );
    expect(guardado.id).toBe('10');
    expect(guardado.rol).toBe(RolUsuario.Postulante);
    expect(guardado.sedeId).toBe('1');
    expect(guardado.carrera).toBe('MEDICINA');
  });

  it('registra la asignación inicial en la misma sentencia de alta y entrega', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      id: 21, nombre: 'Estudiante Sintético', dni: '12345678', correo: '12345678@sofia.edu', password_hash: 'hash-sintetico',
      rol: 'POSTULANTE', activo: true, sede_id: 1, carrera: 'MEDICINA', alcance_administrador: null,
    }] });
    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    const estudiante = Usuario.crearPostulante({ nombre: 'Estudiante Sintético', dni: '12345678',
      correo: '12345678@sofia.edu', passwordHash: 'hash-sintetico', sedeId: '1', carrera: 'Medicina' });
    await repo.guardar(estudiante, { administradorId: '8', referencia: 'referencia-sintetica',
      passwordHash: 'hash-sintetico', tipoPassword: 'ALEATORIA', requiereCambio: false });
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO auditoria_credenciales_usuarios');
    expect(mockQuery.mock.calls[0][0]).toContain("SELECT id, $11, 'ASIGNACION_INICIAL' FROM alta");
    expect(mockQuery.mock.calls[0][1]).not.toContain('contraseña-en-claro-sintética');
  });

  it('registra cambios de contraseña en la misma operación y no audita si la versión no coincide', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 7 }] });
    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    await expect(repo.cambiarPassword('7', 2, 'bcrypt-hash-sintetico', 'CAMBIO_OBLIGATORIO')).resolves.toBe(true);
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO auditoria_credenciales_usuarios');
    expect(mockQuery.mock.calls[0][1]).toEqual(['7', 2, 'bcrypt-hash-sintetico', 'CAMBIO_OBLIGATORIO']);

    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(repo.cambiarPassword('7', 1, 'hash-sintetico', 'CAMBIO_VOLUNTARIO')).resolves.toBe(false);
    expect(mockQuery.mock.calls[1][0]).toContain('SELECT id, id, $4 FROM actualizado');
  });

  it('debe guardar un administrador general sin sede', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          nombre: 'Super Admin',
          dni: null,
          correo: 'admin@sofia.edu',
          password_hash: 'hash_admin',
          rol: 'ADMINISTRADOR',
          activo: true,
          sede_id: null,
          carrera: null,
          alcance_administrador: 'GENERAL',
        },
      ],
    });

    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    const admin = Usuario.crearAdministradorGeneral({
      nombre: 'Super Admin',
      correo: 'admin@sofia.edu',
      passwordHash: 'hash_admin',
    });

    const guardado = await repo.guardar(admin);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO usuarios'),
      [
        'Super Admin',
        null,
        'admin@sofia.edu',
        'hash_admin',
        RolUsuario.Administrador,
        true,
        null,
        null,
        AlcanceAdministrador.General,
        null,
      ]
    );
    expect(guardado.id).toBe('1');
    expect(guardado.alcanceAdministrador).toBe(AlcanceAdministrador.General);
    expect(guardado.sedeId).toBeNull();
  });

  it('debe actualizar un usuario existente', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    const admin = Usuario.crearAdministradorGeneral({
      id: '5',
      nombre: 'Admin Actualizado',
      correo: 'nuevo_correo@sofia.edu',
      passwordHash: 'hash_nuevo',
    });

    await repo.actualizar(admin);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE usuarios'),
      [
        'Admin Actualizado',
        'nuevo_correo@sofia.edu',
        'hash_nuevo',
        true,
        null,
        5,
      ]
    );
  });

  it('debe fallar al actualizar si el usuario no tiene ID o es invalido', async () => {
    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    const sinId = Usuario.crearAdministradorGeneral({
      nombre: 'Admin',
      correo: 'admin@sofia.edu',
      passwordHash: 'hash',
    });

    await expect(repo.actualizar(sinId)).rejects.toThrow(
      'No se puede actualizar un usuario sin identificador.'
    );

    const idInvalido = Usuario.crearAdministradorGeneral({
      id: 'abc',
      nombre: 'Admin',
      correo: 'admin@sofia.edu',
      passwordHash: 'hash',
    });

    await expect(repo.actualizar(idInvalido)).rejects.toThrow(
      'Identificador de usuario no valido: abc'
    );
  });

  it('debe buscar usuario por ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 7,
          nombre: 'Docente Maria',
          dni: '88776655',
          correo: '88776655@sofia.edu',
          password_hash: 'hash_docente',
          rol: 'DOCENTE',
          activo: true,
          sede_id: null,
          carrera: null,
          alcance_administrador: null,
        },
      ],
    });

    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    const usuario = await repo.buscarPorId('7');

    expect(usuario?.id).toBe('7');
    expect(usuario?.rol).toBe(RolUsuario.Docente);
    expect(usuario?.dni).toBe('88776655');

    const usuarioInvalido = await repo.buscarPorId('invalido');
    expect(usuarioInvalido).toBeNull();
  });

  it('debe buscar usuario por DNI', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 12,
          nombre: 'Alumno Test',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          password_hash: 'hash',
          rol: 'POSTULANTE',
          activo: true,
          sede_id: 2,
          carrera: 'DERECHO',
          alcance_administrador: null,
        },
      ],
    });

    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    const usuario = await repo.buscarPorDni('12345678');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE dni = $1'),
      ['12345678']
    );
    expect(usuario?.id).toBe('12');
    expect(usuario?.dni).toBe('12345678');
  });

  it('debe buscar usuario por correo insensible a mayusculas', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          nombre: 'Admin General',
          dni: null,
          correo: 'admin@sofia.edu',
          password_hash: 'hash',
          rol: 'ADMINISTRADOR',
          activo: true,
          sede_id: null,
          carrera: null,
          alcance_administrador: 'GENERAL',
        },
      ],
    });

    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    const usuario = await repo.buscarPorCorreo('  ADMIN@sofia.edu  ');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE LOWER(correo) = LOWER($1)'),
      ['admin@sofia.edu']
    );
    expect(usuario?.correo).toBe('admin@sofia.edu');
  });

  it('debe verificar si existe un administrador general', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    const existe = await repo.existeAdministradorGeneral();
    expect(existe).toBe(true);

    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    const noExiste = await repo.existeAdministradorGeneral();
    expect(noExiste).toBe(false);
  });

  it('debe listar usuarios paginados con y sin filtros de rol y sede', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ total: '1' }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 10,
          nombre: 'Alumno Hana',
          dni: '11112222',
          correo: '11112222@sofia.edu',
          password_hash: 'hash',
          rol: 'POSTULANTE',
          activo: true,
          sede_id: 1,
          carrera: 'HISTORIA',
          alcance_administrador: null,
        },
      ],
    });

    const repo = new PostgresUsuarioRepository(mockPool as Pool);
    const resultado = await repo.listar({
      rol: RolUsuario.Postulante,
      sedeId: '1',
      pagina: 1,
      limite: 10,
    });

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/SELECT COUNT\(\*\).*AND \(rol <> 'POSTULANTE' OR activo\).*AND rol = \$1 AND sede_id = \$2/),
      [RolUsuario.Postulante, 1]
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LIMIT $3 OFFSET $4;'),
      [RolUsuario.Postulante, 1, 10, 0]
    );
    expect(resultado.total).toBe(1);
    expect(resultado.pagina).toBe(1);
    expect(resultado.limite).toBe(10);
    expect(resultado.usuarios).toHaveLength(1);
    expect(resultado.usuarios[0].sedeId).toBe('1');
  });
});

  it('aplica el mismo término literal y alcance a total y resultados antes de paginar', async () => {
    const query = jest.fn().mockResolvedValueOnce({ rows: [{ total: '1' }] }).mockResolvedValueOnce({ rows: [] });
    const repo = new PostgresUsuarioRepository({ query });
    await repo.listar({ q: "O'Connor%_", rol: RolUsuario.Postulante, sedeId: '2', soloArchivados: true, pagina: 2, limite: 10 });
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining('strpos(LOWER(nombre), LOWER($3::text))'), ['POSTULANTE', 2, "O'Connor%_"]);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT $4 OFFSET $5'), ['POSTULANTE', 2, "O'Connor%_", 10, 10]);
    expect(query.mock.calls[1][0]).toContain("AND rol = 'POSTULANTE' AND NOT activo");
    expect(query.mock.calls[1][0]).not.toContain("O'Connor");
  });
