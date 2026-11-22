import express, { Application } from 'express';
import request from 'supertest';
import { crearRutasUsuario } from './usuario.routes';
import { UsuarioController } from './usuario.controller';
import { MiddlewareAutenticacion } from './autenticacion.middleware';
import { RegistrarEstudianteUseCase } from '../aplicacion/registrar-estudiante.use-case';
import { RegistrarDocenteUseCase } from '../aplicacion/registrar-docente.use-case';
import { IniciarSesionUseCase } from '../aplicacion/iniciar-sesion.use-case';
import { CambiarPasswordUseCase } from '../aplicacion/cambiar-password.use-case';
import { CambiarCorreoUseCase } from '../aplicacion/cambiar-correo.use-case';
import { ListarUsuariosUseCase } from '../aplicacion/listar-usuarios.use-case';
import { ServicioToken, PayloadToken } from '../aplicacion/servicio-token.port';
import {
  Usuario,
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorValidacion,
  ErrorConflicto,
  ErrorAccesoDenegado,
  ErrorAutenticacion,
} from '../dominio';

describe('Rutas de Usuario (ADR-008, CA-U01, CA-U03, CA-U05, CA-U06)', () => {
  let app: Application;
  let mockEstudianteUseCase: Partial<RegistrarEstudianteUseCase>;
  let mockDocenteUseCase: Partial<RegistrarDocenteUseCase>;
  let mockLoginUseCase: Partial<IniciarSesionUseCase>;
  let mockCambiarPasswordUseCase: Partial<CambiarPasswordUseCase>;
  let mockCambiarCorreoUseCase: Partial<CambiarCorreoUseCase>;
  let mockListarUsuariosUseCase: Partial<ListarUsuariosUseCase>;
  let mockServicioToken: Partial<ServicioToken>;
  let mockUsuarioRepo: Partial<UsuarioRepository>;

  beforeEach(() => {
    mockEstudianteUseCase = {
      ejecutar: jest.fn(),
    };
    mockDocenteUseCase = {
      ejecutar: jest.fn(),
    };
    mockLoginUseCase = {
      ejecutar: jest.fn(),
    };
    mockCambiarPasswordUseCase = {
      ejecutar: jest.fn(),
    };
    mockCambiarCorreoUseCase = {
      ejecutar: jest.fn(),
    };
    mockListarUsuariosUseCase = {
      ejecutar: jest.fn(),
    };
    mockServicioToken = {
      verificarToken: jest.fn(),
    };
    mockUsuarioRepo = {
      buscarPorId: jest.fn(),
    };

    const controller = new UsuarioController(
      mockEstudianteUseCase as RegistrarEstudianteUseCase,
      mockDocenteUseCase as RegistrarDocenteUseCase,
      mockLoginUseCase as IniciarSesionUseCase,
      mockCambiarPasswordUseCase as CambiarPasswordUseCase,
      mockCambiarCorreoUseCase as CambiarCorreoUseCase,
      mockListarUsuariosUseCase as ListarUsuariosUseCase
    );

    const middleware = new MiddlewareAutenticacion(
      mockServicioToken as ServicioToken,
      mockUsuarioRepo as UsuarioRepository
    );

    app = express();
    app.use(express.json());
    app.use('/api/usuarios', crearRutasUsuario(controller, middleware));
  });

  describe('POST /api/usuarios/login', () => {
    it('(CA-U05) debe responder 200 con token y usuario al autenticar con éxito', async () => {
      (mockLoginUseCase.ejecutar as jest.Mock).mockResolvedValueOnce({
        token: 'token.jwt.valido',
        usuario: {
          id: 'u1',
          nombre: 'Juan Perez',
          correo: 'juan@sofia.edu',
          rol: RolUsuario.Postulante,
          sedeId: 'Hana',
        },
      });

      const res = await request(app)
        .post('/api/usuarios/login')
        .send({ correo: 'juan@sofia.edu', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBe('token.jwt.valido');
      expect(res.body.usuario.nombre).toBe('Juan Perez');
      expect(res.body.usuario.passwordHash).toBeUndefined();
    });

    it('(CA-U05) debe responder 401 con mensaje genérico si falla el login', async () => {
      (mockLoginUseCase.ejecutar as jest.Mock).mockRejectedValueOnce(
        new Error('Credenciales invalidas.')
      );

      const res = await request(app)
        .post('/api/usuarios/login')
        .send({ correo: 'juan@sofia.edu', password: 'clave_erronea' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Credenciales invalidas.' });
    });
  });

  describe('POST /api/usuarios/estudiantes', () => {
    it('(CA-U06) debe responder 401 si no se envía token', async () => {
      const res = await request(app)
        .post('/api/usuarios/estudiantes')
        .send({ nombre: 'Alumno', dni: '71234567', sedeId: 'Hana', carrera: 'Medicina' });

      expect(res.status).toBe(401);
    });

    it('(CA-U06) debe responder 403 si el rol autenticado no es Administrador', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'u-post',
        rol: RolUsuario.Postulante,
        sedeId: 'Hana',
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearPostulante({
          id: 'u-post',
          nombre: 'Postulante',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          passwordHash: 'hash',
          sedeId: 'Hana',
          carrera: 'DERECHO',
          activo: true,
        })
      );

      const res = await request(app)
        .post('/api/usuarios/estudiantes')
        .set('Authorization', 'Bearer token_postulante')
        .send({ nombre: 'Alumno', dni: '71234567', sedeId: 'Hana', carrera: 'Medicina' });

      expect(res.status).toBe(403);
    });

    it('(CA-U01) debe responder 201 y datos del postulante si el admin registra con éxito', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'admin-1',
        rol: RolUsuario.Administrador,
        sedeId: null,
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearAdministradorGeneral({
          id: 'admin-1',
          nombre: 'Admin General',
          correo: 'admin@sofia.edu',
          passwordHash: 'hash',
          activo: true,
        })
      );

      const postulanteCreado = Usuario.crearPostulante({
        id: 'post-nuevo',
        nombre: 'Carlos Estudiante',
        dni: '71234567',
        correo: '71234567@sofia.edu',
        passwordHash: 'hash_71234567',
        sedeId: 'Hana',
        carrera: 'MEDICINA',
        activo: true,
      });
      (mockEstudianteUseCase.ejecutar as jest.Mock).mockResolvedValueOnce(postulanteCreado);

      const res = await request(app)
        .post('/api/usuarios/estudiantes')
        .set('Authorization', 'Bearer token_admin')
        .send({
          nombre: 'Carlos Estudiante',
          dni: '71234567',
          sedeId: 'Hana',
          carrera: 'Medicina',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('post-nuevo');
      expect(res.body.dni).toBe('71234567');
      expect(res.body.correo).toBe('71234567@sofia.edu');
      expect(res.body.carrera).toBe('MEDICINA');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('(CA-U01) debe responder 400 si faltan datos de validación', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'admin-1',
        rol: RolUsuario.Administrador,
        sedeId: null,
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearAdministradorGeneral({
          id: 'admin-1',
          nombre: 'Admin General',
          correo: 'admin@sofia.edu',
          passwordHash: 'hash',
          activo: true,
        })
      );
      (mockEstudianteUseCase.ejecutar as jest.Mock).mockRejectedValueOnce(
        new ErrorValidacion('El DNI debe tener exactamente 8 digitos numericos.')
      );

      const res = await request(app)
        .post('/api/usuarios/estudiantes')
        .set('Authorization', 'Bearer token_admin')
        .send({ nombre: 'Carlos', dni: '123', sedeId: 'Hana', carrera: 'Medicina' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('8 digitos numericos');
    });

    it('(CA-U01) debe responder 409 si el DNI ya está registrado', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'admin-1',
        rol: RolUsuario.Administrador,
        sedeId: null,
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearAdministradorGeneral({
          id: 'admin-1',
          nombre: 'Admin General',
          correo: 'admin@sofia.edu',
          passwordHash: 'hash',
          activo: true,
        })
      );
      (mockEstudianteUseCase.ejecutar as jest.Mock).mockRejectedValueOnce(
        new ErrorConflicto('El DNI ya se encuentra registrado.')
      );

      const res = await request(app)
        .post('/api/usuarios/estudiantes')
        .set('Authorization', 'Bearer token_admin')
        .send({ nombre: 'Carlos', dni: '71234567', sedeId: 'Hana', carrera: 'Medicina' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('DNI ya se encuentra registrado');
    });
  });

  describe('POST /api/usuarios/docentes', () => {
    it('(CA-U03) debe responder 201 y datos del docente si el admin general registra con éxito', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'admin-1',
        rol: RolUsuario.Administrador,
        sedeId: null,
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearAdministradorGeneral({
          id: 'admin-1',
          nombre: 'Admin General',
          correo: 'admin@sofia.edu',
          passwordHash: 'hash',
          activo: true,
        })
      );

      const docenteCreado = Usuario.crearDocente({
        id: 'doc-nuevo',
        nombre: 'Profesor Ricardo',
        dni: '10203040',
        correo: '10203040@sofia.edu',
        passwordHash: 'hash_10203040',
        activo: true,
      });
      (mockDocenteUseCase.ejecutar as jest.Mock).mockResolvedValueOnce(docenteCreado);

      const res = await request(app)
        .post('/api/usuarios/docentes')
        .set('Authorization', 'Bearer token_admin')
        .send({ nombre: 'Profesor Ricardo', dni: '10203040' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('doc-nuevo');
      expect(res.body.correo).toBe('10203040@sofia.edu');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('(CA-U03) debe responder 403 si un administrador de sede intenta registrar un docente', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'admin-sede',
        rol: RolUsuario.Administrador,
        sedeId: 'Hana',
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearAdministradorSede({
          id: 'admin-sede',
          nombre: 'Admin Sede',
          correo: 'admin.sede@sofia.edu',
          passwordHash: 'hash',
          sedeId: 'Hana',
          activo: true,
        })
      );
      (mockDocenteUseCase.ejecutar as jest.Mock).mockRejectedValueOnce(
        new ErrorAccesoDenegado('Acceso denegado: solo el administrador general puede registrar docentes.')
      );

      const res = await request(app)
        .post('/api/usuarios/docentes')
        .set('Authorization', 'Bearer token_admin_sede')
        .send({ nombre: 'Profesor Ricardo', dni: '10203040' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('solo el administrador general puede registrar docentes');
    });
  });

  describe('PATCH /api/usuarios/password (RF26, CA-U08)', () => {
    it('(CA-U08) debe responder 200 y mensaje de exito al cambiar la contrasena correctamente', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        rol: RolUsuario.Postulante,
        sedeId: 'Hana',
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearPostulante({
          id: 'user-1',
          nombre: 'Alumno Test',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          passwordHash: 'hash',
          sedeId: 'Hana',
          carrera: 'MEDICINA',
          activo: true,
        })
      );
      (mockCambiarPasswordUseCase.ejecutar as jest.Mock).mockResolvedValueOnce(undefined);

      const res = await request(app)
        .patch('/api/usuarios/password')
        .set('Authorization', 'Bearer token_valido')
        .send({
          passwordActual: '12345678',
          passwordNueva: 'nueva_clave_segura_123',
        });

      expect(res.status).toBe(200);
      expect(res.body.mensaje).toContain('Contrasena actualizada con exito.');
      expect(mockCambiarPasswordUseCase.ejecutar).toHaveBeenCalledWith({
        usuarioId: 'user-1',
        passwordActual: '12345678',
        passwordNueva: 'nueva_clave_segura_123',
      });
    });

    it('(CA-U08) debe responder 401 si no se envia token de autenticacion', async () => {
      const res = await request(app)
        .patch('/api/usuarios/password')
        .send({
          passwordActual: '12345678',
          passwordNueva: 'nueva_clave_segura_123',
        });

      expect(res.status).toBe(401);
    });

    it('(CA-U08) debe responder 400 si la contrasena nueva es menor a 8 caracteres', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        rol: RolUsuario.Postulante,
        sedeId: 'Hana',
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearPostulante({
          id: 'user-1',
          nombre: 'Alumno Test',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          passwordHash: 'hash',
          sedeId: 'Hana',
          carrera: 'MEDICINA',
          activo: true,
        })
      );
      (mockCambiarPasswordUseCase.ejecutar as jest.Mock).mockRejectedValueOnce(
        new ErrorValidacion('La nueva contrasena debe tener al menos 8 caracteres.')
      );

      const res = await request(app)
        .patch('/api/usuarios/password')
        .set('Authorization', 'Bearer token_valido')
        .send({
          passwordActual: '12345678',
          passwordNueva: 'corta',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('al menos 8 caracteres');
    });

    it('(CA-U08) debe responder 401 si la contrasena actual es incorrecta', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        rol: RolUsuario.Postulante,
        sedeId: 'Hana',
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearPostulante({
          id: 'user-1',
          nombre: 'Alumno Test',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          passwordHash: 'hash',
          sedeId: 'Hana',
          carrera: 'MEDICINA',
          activo: true,
        })
      );
      (mockCambiarPasswordUseCase.ejecutar as jest.Mock).mockRejectedValueOnce(
        new ErrorAutenticacion('Credenciales invalidas.')
      );

      const res = await request(app)
        .patch('/api/usuarios/password')
        .set('Authorization', 'Bearer token_valido')
        .send({
          passwordActual: 'clave_incorrecta',
          passwordNueva: 'nueva_clave_segura_123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Credenciales invalidas.');
    });
  });

  describe('PATCH /api/usuarios/correo (RF26, CA-U09)', () => {
    const mockAdminPayload = {
      id: 'admin-1',
      rol: RolUsuario.Administrador,
      sedeId: null,
    };
    const mockAdmin = Usuario.crearAdministradorGeneral({
      id: 'admin-1',
      nombre: 'Admin General',
      correo: 'admin@sofia.edu',
      passwordHash: 'hash',
      activo: true,
    });

    it('(CA-U09) debe responder 200 cuando admin cambia su correo correctamente', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce(mockAdminPayload);
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(mockAdmin);
      (mockCambiarCorreoUseCase.ejecutar as jest.Mock).mockResolvedValueOnce(undefined);

      const res = await request(app)
        .patch('/api/usuarios/correo')
        .set('Authorization', 'Bearer token_admin')
        .send({ nuevoCorreo: 'nuevo@sofia.edu', passwordActual: 'clave' });

      expect(res.status).toBe(200);
      expect(res.body.mensaje).toContain('Correo actualizado con exito.');
    });

    it('(CA-U09) debe responder 401 sin token', async () => {
      const res = await request(app)
        .patch('/api/usuarios/correo')
        .send({ nuevoCorreo: 'nuevo@sofia.edu', passwordActual: 'clave' });
      expect(res.status).toBe(401);
    });

    it('(CA-U09) debe responder 403 si postulante intenta cambiar correo', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'post-1',
        rol: RolUsuario.Postulante,
        sedeId: 'Hana',
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearPostulante({
          id: 'post-1',
          nombre: 'Postulante Test',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          passwordHash: 'hash',
          sedeId: 'Hana',
          carrera: 'MEDICINA',
          activo: true,
        })
      );

      const res = await request(app)
        .patch('/api/usuarios/correo')
        .set('Authorization', 'Bearer token_postulante')
        .send({ nuevoCorreo: 'nuevo@sofia.edu', passwordActual: 'clave' });

      expect(res.status).toBe(403);
    });

    it('(CA-U09) debe responder 409 si el correo ya existe', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce(mockAdminPayload);
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(mockAdmin);
      (mockCambiarCorreoUseCase.ejecutar as jest.Mock).mockRejectedValueOnce(
        new ErrorConflicto('El correo ya esta en uso por otro usuario.')
      );

      const res = await request(app)
        .patch('/api/usuarios/correo')
        .set('Authorization', 'Bearer token_admin')
        .send({ nuevoCorreo: 'ocupado@sofia.edu', passwordActual: 'clave' });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/usuarios (RF23, CA-U10)', () => {
    const mockAdminGeneralPayload = {
      id: 'admin-gen',
      rol: RolUsuario.Administrador,
      sedeId: null,
      alcanceAdministrador: AlcanceAdministrador.General,
    };
    const mockAdminGeneral = Usuario.crearAdministradorGeneral({
      id: 'admin-gen',
      nombre: 'Admin General',
      correo: 'admin@sofia.edu',
      passwordHash: 'hash',
      activo: true,
    });

    const mockAdminSedePayload = {
      id: 'admin-sede-1',
      rol: RolUsuario.Administrador,
      sedeId: '1',
      alcanceAdministrador: AlcanceAdministrador.Sede,
    };
    const mockAdminSede = Usuario.crearAdministradorSede({
      id: 'admin-sede-1',
      nombre: 'Admin Sede Hana',
      correo: 'admin.hana@sofia.edu',
      passwordHash: 'hash',
      sedeId: '1',
      activo: true,
    });

    it('(CA-U10) debe responder 200 con listado paginado para el administrador general', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce(mockAdminGeneralPayload);
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(mockAdminGeneral);
      (mockListarUsuariosUseCase.ejecutar as jest.Mock).mockResolvedValueOnce({
        usuarios: [
          {
            id: '1',
            nombre: 'Alumno Test',
            dni: '12345678',
            correo: '12345678@sofia.edu',
            rol: RolUsuario.Postulante,
            activo: true,
            sedeId: '1',
            carrera: 'MEDICINA',
          },
        ],
        total: 1,
        pagina: 1,
        limite: 20,
      });

      const res = await request(app)
        .get('/api/usuarios?pagina=1&limite=20')
        .set('Authorization', 'Bearer token_admin_general');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.usuarios).toHaveLength(1);
      expect(res.body.usuarios[0].nombre).toBe('Alumno Test');
    });

    it('(CA-U10) debe responder 200 con postulantes para el administrador de sede', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce(mockAdminSedePayload);
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(mockAdminSede);
      (mockListarUsuariosUseCase.ejecutar as jest.Mock).mockResolvedValueOnce({
        usuarios: [
          {
            id: '1',
            nombre: 'Alumno Hana',
            dni: '12345678',
            correo: '12345678@sofia.edu',
            rol: RolUsuario.Postulante,
            activo: true,
            sedeId: '1',
            carrera: 'MEDICINA',
          },
        ],
        total: 1,
        pagina: 1,
        limite: 20,
      });

      const res = await request(app)
        .get('/api/usuarios')
        .set('Authorization', 'Bearer token_admin_sede');

      expect(res.status).toBe(200);
      expect(res.body.usuarios[0].sedeId).toBe('1');
    });

    it('(CA-U10) debe responder 401 si no se envía token', async () => {
      const res = await request(app).get('/api/usuarios');
      expect(res.status).toBe(401);
    });

    it('(CA-U10) debe responder 403 si un postulante intenta listar usuarios', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'post-1',
        rol: RolUsuario.Postulante,
        sedeId: '1',
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearPostulante({
          id: 'post-1',
          nombre: 'Postulante',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          passwordHash: 'hash',
          sedeId: '1',
          carrera: 'MEDICINA',
          activo: true,
        })
      );

      const res = await request(app)
        .get('/api/usuarios')
        .set('Authorization', 'Bearer token_postulante');

      expect(res.status).toBe(403);
    });

    it('(CA-U10) debe responder 403 si admin de sede intenta consultar otra sede', async () => {
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce(mockAdminSedePayload);
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(mockAdminSede);
      (mockListarUsuariosUseCase.ejecutar as jest.Mock).mockRejectedValueOnce(
        new ErrorAccesoDenegado('Acceso denegado: el administrador de sede no puede consultar usuarios de otra sede.')
      );

      const res = await request(app)
        .get('/api/usuarios?sedeId=2')
        .set('Authorization', 'Bearer token_admin_sede');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('otra sede');
    });
  });
});
