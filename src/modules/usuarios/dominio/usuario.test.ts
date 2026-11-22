import { Usuario } from './usuario';
import { RolUsuario, AlcanceAdministrador } from './rol-usuario';

describe('Entidad Usuario', () => {
  describe('Postulante', () => {
    it('debe crear un postulante valido con carrera normalizada', () => {
      const postulante = Usuario.crearPostulante({
        id: 'u-1',
        nombre: 'Juan Perez',
        dni: '12345678',
        correo: '12345678@sofia.edu',
        passwordHash: 'hash_123',
        sedeId: 'sede-hana',
        carrera: '  ingenieria de sistemas  ',
      });

      expect(postulante.rol).toBe(RolUsuario.Postulante);
      expect(postulante.carrera).toBe('INGENIERIA DE SISTEMAS');
      expect(postulante.sedeId).toBe('sede-hana');
      expect(postulante.activo).toBe(true);
      expect(postulante.dni).toBe('12345678');
      expect(postulante.alcanceAdministrador).toBeNull();
    });

    it('debe fallar si el DNI no tiene 8 digitos numericos', () => {
      expect(() =>
        Usuario.crearPostulante({
          nombre: 'Juan Perez',
          dni: '1234567', // 7 dígitos
          correo: '1234567@sofia.edu',
          passwordHash: 'hash_123',
          sedeId: 'sede-hana',
          carrera: 'MEDICINA',
        })
      ).toThrow('El DNI debe tener exactamente 8 digitos numericos.');

      expect(() =>
        Usuario.crearPostulante({
          nombre: 'Juan Perez',
          dni: '1234567A', // letras
          correo: '1234567a@sofia.edu',
          passwordHash: 'hash_123',
          sedeId: 'sede-hana',
          carrera: 'MEDICINA',
        })
      ).toThrow('El DNI debe tener exactamente 8 digitos numericos.');
    });

    it('debe fallar si no se proporciona sede o carrera para un postulante', () => {
      expect(() =>
        Usuario.crearPostulante({
          nombre: 'Juan Perez',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          passwordHash: 'hash_123',
          sedeId: '',
          carrera: 'MEDICINA',
        })
      ).toThrow('La sede es obligatoria para los postulantes.');

      expect(() =>
        Usuario.crearPostulante({
          nombre: 'Juan Perez',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          passwordHash: 'hash_123',
          sedeId: 'sede-hana',
          carrera: '',
        })
      ).toThrow('La carrera es obligatoria para los postulantes.');
    });
  });

  describe('Docente', () => {
    it('debe crear un docente valido sin sede ni carrera', () => {
      const docente = Usuario.crearDocente({
        id: 'u-2',
        nombre: 'Maria Docente',
        dni: '87654321',
        correo: '87654321@sofia.edu',
        passwordHash: 'hash_456',
      });

      expect(docente.rol).toBe(RolUsuario.Docente);
      expect(docente.sedeId).toBeNull();
      expect(docente.carrera).toBeNull();
      expect(docente.alcanceAdministrador).toBeNull();
      expect(docente.activo).toBe(true);
    });

    it('debe rechazar docente asignado a una sede', () => {
      expect(
        () =>
          new Usuario({
            nombre: 'Maria Docente',
            dni: '87654321',
            correo: '87654321@sofia.edu',
            passwordHash: 'hash_456',
            rol: RolUsuario.Docente,
            sedeId: 'sede-hana',
          })
      ).toThrow('Los docentes no pertenecen a una sede.');
    });
  });

  describe('Administrador General y Administrador de Sede', () => {
    it('debe crear un administrador general sin sede', () => {
      const adminGen = Usuario.crearAdministradorGeneral({
        id: 'u-3',
        nombre: 'Super Admin',
        correo: 'admin@sofia.edu',
        passwordHash: 'hash_admin',
      });

      expect(adminGen.rol).toBe(RolUsuario.Administrador);
      expect(adminGen.alcanceAdministrador).toBe(AlcanceAdministrador.General);
      expect(adminGen.sedeId).toBeNull();
    });

    it('debe rechazar administrador general con sede', () => {
      expect(
        () =>
          new Usuario({
            nombre: 'Admin General',
            correo: 'admin@sofia.edu',
            passwordHash: 'hash_admin',
            rol: RolUsuario.Administrador,
            alcanceAdministrador: AlcanceAdministrador.General,
            sedeId: 'sede-hana',
          })
      ).toThrow('El administrador general no pertenece a una sede.');
    });

    it('debe crear un administrador de sede asociado a una sede', () => {
      const adminSede = Usuario.crearAdministradorSede({
        id: 'u-4',
        nombre: 'Admin Hana',
        correo: 'admin.hana@sofia.edu',
        passwordHash: 'hash_hana',
        sedeId: 'sede-hana',
      });

      expect(adminSede.rol).toBe(RolUsuario.Administrador);
      expect(adminSede.alcanceAdministrador).toBe(AlcanceAdministrador.Sede);
      expect(adminSede.sedeId).toBe('sede-hana');
    });

    it('debe rechazar administrador de sede sin sede', () => {
      expect(
        () =>
          new Usuario({
            nombre: 'Admin Hana',
            correo: 'admin.hana@sofia.edu',
            passwordHash: 'hash_hana',
            rol: RolUsuario.Administrador,
            alcanceAdministrador: AlcanceAdministrador.Sede,
            sedeId: '',
          })
      ).toThrow('La sede es obligatoria para administradores de sede.');
    });
  });

  describe('Metodos de negocio de Usuario', () => {
    it('debe desactivar y reactivar usuario correctamente', () => {
      const usuario = Usuario.crearPostulante({
        nombre: 'Pedro',
        dni: '11223344',
        correo: '11223344@sofia.edu',
        passwordHash: 'hash_123',
        sedeId: 'sede-1',
        carrera: 'DERECHO',
      });

      expect(usuario.activo).toBe(true);
      usuario.desactivar();
      expect(usuario.activo).toBe(false);
      usuario.reactivar();
      expect(usuario.activo).toBe(true);
    });

    it('debe cambiar passwordHash correctamente', () => {
      const usuario = Usuario.crearPostulante({
        nombre: 'Pedro',
        dni: '11223344',
        correo: '11223344@sofia.edu',
        passwordHash: 'hash_antiguo',
        sedeId: 'sede-1',
        carrera: 'DERECHO',
      });

      usuario.cambiarPasswordHash('hash_nuevo');
      expect(usuario.passwordHash).toBe('hash_nuevo');

      expect(() => usuario.cambiarPasswordHash('')).toThrow(
        'El nuevo hash de contrasena no puede estar vacio.'
      );
    });

    it('debe permitir cambiar correo a administradores y rechazar para postulantes o docentes', () => {
      const admin = Usuario.crearAdministradorGeneral({
        nombre: 'Admin',
        correo: 'admin@sofia.edu',
        passwordHash: 'hash',
      });

      admin.cambiarCorreo('nuevo.admin@sofia.edu');
      expect(admin.correo).toBe('nuevo.admin@sofia.edu');

      const postulante = Usuario.crearPostulante({
        nombre: 'Pedro',
        dni: '11223344',
        correo: '11223344@sofia.edu',
        passwordHash: 'hash_123',
        sedeId: 'sede-1',
        carrera: 'DERECHO',
      });

      expect(() => postulante.cambiarCorreo('otro@sofia.edu')).toThrow(
        'Solo los administradores pueden cambiar su correo.'
      );
    });
  });
});
