import express, { Application } from 'express';
import request from 'supertest';
import { crearRutasUsuario } from './usuario.routes';
import { UsuarioController } from './usuario.controller';
import { MiddlewareAutenticacion } from './autenticacion.middleware';
import { RegistrarEstudianteUseCase } from '../aplicacion/registrar-estudiante.use-case';
import { RegistrarDocenteUseCase } from '../aplicacion/registrar-docente.use-case';
import { IniciarSesionUseCase } from '../aplicacion/iniciar-sesion.use-case';
import { ServicioToken, PayloadToken } from '../aplicacion/servicio-token.port';
import {
  Usuario,
  UsuarioRepository,
  RolUsuario,
  AlcanceAdministrador,
  ErrorValidacion,
  ErrorConflicto,
  ErrorAccesoDenegado,
} from '../dominio';

describe('Rutas de Usuario (ADR-008, CA-U01, CA-U03, CA-U05, CA-U06)', () => {
  let app: Application;
  let mockEstudianteUseCase: Partial<RegistrarEstudianteUseCase>;
  let mockDocenteUseCase: Partial<RegistrarDocenteUseCase>;
  let mockLoginUseCase: Partial<IniciarSesionUseCase>;
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
    mockServicioToken = {
      verificarToken: jest.fn(),
    };
    mockUsuarioRepo = {
      buscarPorId: jest.fn(),
    };

    const controller = new UsuarioController(
      mockEstudianteUseCase as RegistrarEstudianteUseCase,
      mockDocenteUseCase as RegistrarDocenteUseCase,
      mockLoginUseCase as IniciarSesionUseCase
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
});
