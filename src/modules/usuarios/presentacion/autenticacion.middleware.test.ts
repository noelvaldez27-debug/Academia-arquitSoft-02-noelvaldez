import { Request, Response, NextFunction } from 'express';
import { MiddlewareAutenticacion } from './autenticacion.middleware';
import { ServicioToken, PayloadToken } from '../aplicacion/servicio-token.port';
import { UsuarioRepository, Usuario, RolUsuario, AlcanceAdministrador } from '../dominio';

describe('MiddlewareAutenticacion (AC04, ADR-007, RC15, CA-U06)', () => {
  let mockServicioToken: ServicioToken;
  let mockUsuarioRepo: UsuarioRepository;
  let middleware: MiddlewareAutenticacion;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      headers: {},
      params: {},
      body: {},
      query: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();

    mockServicioToken = {
      generarToken: jest.fn(),
      verificarToken: jest.fn(),
    };

    mockUsuarioRepo = {
      guardar: jest.fn(),
      actualizar: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorDni: jest.fn(),
      buscarPorCorreo: jest.fn(),
      existeAdministradorGeneral: jest.fn(),
      listar: jest.fn(),
    };

    middleware = new MiddlewareAutenticacion(mockServicioToken, mockUsuarioRepo);
  });

  describe('autenticar', () => {
    it('CA-VS01 rechaza el JWT anterior tras reactivar y acepta el emitido para la nueva versión', async () => {
      mockReq.headers = { authorization: 'Bearer sesion' };
      const usuario = Usuario.crearPostulante({
        id: '1', nombre: 'Postulante sintético', correo: '12345678@sofia.edu', dni: '12345678',
        passwordHash: 'hash-sintetico', sedeId: '1', carrera: 'Medicina',
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValue(new Usuario({
        id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, dni: usuario.dni,
        passwordHash: usuario.passwordHash, sedeId: usuario.sedeId, carrera: usuario.carrera,
        rol: usuario.rol, versionSesion: 2,
      }));
      const datos = { id: '1', rol: RolUsuario.Postulante, sedeId: '1' };
      (mockServicioToken.verificarToken as jest.Mock)
        .mockResolvedValueOnce(datos)
        .mockResolvedValueOnce({ ...datos, versionSesion: 2 });
      await middleware.autenticar(mockReq as Request, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
      await middleware.autenticar(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
    it('(CA-U06) debe responder 401 si no se envía header Authorization o no empieza con Bearer', async () => {
      await middleware.autenticar(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('token no proporcionado') })
      );
      expect(mockNext).not.toHaveBeenCalled();

      mockReq.headers = { authorization: 'Basic 123456' };
      await middleware.autenticar(mockReq as Request, mockRes as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('(CA-U06) debe responder 401 si el token es vacío', async () => {
      mockReq.headers = { authorization: 'Bearer   ' };
      await middleware.autenticar(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('token vacio') })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('(CA-U06) debe responder 401 si el token es inválido o expiró', async () => {
      mockReq.headers = { authorization: 'Bearer token_invalido' };
      (mockServicioToken.verificarToken as jest.Mock).mockRejectedValueOnce(
        new Error('Token expirado')
      );

      await middleware.autenticar(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('token invalido o expirado') })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('(CA-U06) debe responder 401 si el usuario no existe en la base de datos', async () => {
      mockReq.headers = { authorization: 'Bearer token_valido' };
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'user-borrado',
        rol: RolUsuario.Postulante,
        sedeId: 'sede-hana',
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(null);

      await middleware.autenticar(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('cuenta inactiva o inexistente') })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('(CA-U06) debe responder 401 si el usuario se encuentra inactivo en la base de datos, aunque el JWT esté vigente', async () => {
      mockReq.headers = { authorization: 'Bearer token_valido' };
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'user-desactivado',
        rol: RolUsuario.Postulante,
        sedeId: 'sede-hana',
      });
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        new Usuario({
          id: 'user-desactivado',
          nombre: 'Alumno Inactivo',
          dni: '12345678',
          correo: '12345678@sofia.edu',
          passwordHash: 'hash',
          rol: RolUsuario.Postulante,
          sedeId: 'sede-hana',
          carrera: 'DERECHO',
          activo: false,
        })
      );

      await middleware.autenticar(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('cuenta inactiva o inexistente') })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('(CA-U06) debe autenticar exitosamente y cargar rol y sede actuales de la base de datos', async () => {
      mockReq.headers = { authorization: 'Bearer token_valido' };
      // En el JWT tenía rol Postulante y sede Hana
      (mockServicioToken.verificarToken as jest.Mock).mockResolvedValueOnce({
        id: 'user-actualizado',
        rol: RolUsuario.Postulante,
        sedeId: 'sede-hana',
      });
      // Pero en la base de datos ahora es Administrador de Sede Urin
      (mockUsuarioRepo.buscarPorId as jest.Mock).mockResolvedValueOnce(
        Usuario.crearAdministradorSede({
          id: 'user-actualizado',
          nombre: 'Admin Promovido',
          correo: 'promovido@sofia.edu',
          passwordHash: 'hash',
          sedeId: 'sede-urin',
          activo: true,
        })
      );

      await middleware.autenticar(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.usuario).toBeDefined();
      expect(mockReq.usuario?.id).toBe('user-actualizado');
      // Debe reflejar los datos actuales de la BD, no los del JWT
      expect(mockReq.usuario?.rol).toBe(RolUsuario.Administrador);
      expect(mockReq.usuario?.sedeId).toBe('sede-urin');
      expect(mockReq.usuario?.alcanceAdministrador).toBe(AlcanceAdministrador.Sede);
    });
  });

  describe('requerirRol', () => {
    it('(CA-U06) debe responder 401 si no hay usuario autenticado en la petición', () => {
      const authRol = middleware.requerirRol(RolUsuario.Administrador);
      authRol(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('(CA-U06) debe responder 403 si el usuario tiene un rol distinto al permitido', () => {
      mockReq.usuario = {
        id: 'u1',
        nombre: 'Postulante',
        correo: 'post@sofia.edu',
        rol: RolUsuario.Postulante,
        activo: true,
        sedeId: 'sede-hana',
        carrera: 'MEDICINA',
        alcanceAdministrador: null,
      };

      const authRol = middleware.requerirRol(RolUsuario.Administrador, RolUsuario.Docente);
      authRol(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('permisos insuficientes') })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('(CA-U06) debe permitir continuar si el rol está entre los permitidos', () => {
      mockReq.usuario = {
        id: 'u1',
        nombre: 'Admin General',
        correo: 'admin@sofia.edu',
        rol: RolUsuario.Administrador,
        activo: true,
        sedeId: null,
        carrera: null,
        alcanceAdministrador: AlcanceAdministrador.General,
      };

      const authRol = middleware.requerirRol(RolUsuario.Administrador);
      authRol(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('requerirAlcanceSede', () => {
    it('(CA-U06) debe permitir siempre al administrador general acceder a cualquier sede', () => {
      mockReq.usuario = {
        id: 'admin-gen',
        nombre: 'Admin General',
        correo: 'admin@sofia.edu',
        rol: RolUsuario.Administrador,
        activo: true,
        sedeId: null,
        carrera: null,
        alcanceAdministrador: AlcanceAdministrador.General,
      };
      mockReq.body = { sedeId: 'cualquier-sede' };

      const checkSede = middleware.requerirAlcanceSede();
      checkSede(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('(CA-U06) debe permitir al administrador de sede operar sobre su propia sede', () => {
      mockReq.usuario = {
        id: 'admin-sede',
        nombre: 'Admin Sede Hana',
        correo: 'admin.hana@sofia.edu',
        rol: RolUsuario.Administrador,
        activo: true,
        sedeId: 'sede-hana',
        carrera: null,
        alcanceAdministrador: AlcanceAdministrador.Sede,
      };
      mockReq.params = { sedeId: 'sede-hana' };

      const checkSede = middleware.requerirAlcanceSede();
      checkSede(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('(CA-U06) debe responder 403 si el administrador de sede intenta operar sobre otra sede', () => {
      mockReq.usuario = {
        id: 'admin-sede',
        nombre: 'Admin Sede Hana',
        correo: 'admin.hana@sofia.edu',
        rol: RolUsuario.Administrador,
        activo: true,
        sedeId: 'sede-hana',
        carrera: null,
        alcanceAdministrador: AlcanceAdministrador.Sede,
      };
      mockReq.body = { sedeId: 'sede-urin' };

      const checkSede = middleware.requerirAlcanceSede();
      checkSede(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('solo puede gestionar recursos de su propia sede') })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('(CA-U06) debe responder 400 si el administrador de sede no envía sede objetivo', () => {
      mockReq.usuario = {
        id: 'admin-sede',
        nombre: 'Admin Sede Hana',
        correo: 'admin.hana@sofia.edu',
        rol: RolUsuario.Administrador,
        activo: true,
        sedeId: 'sede-hana',
        carrera: null,
        alcanceAdministrador: AlcanceAdministrador.Sede,
      };

      const checkSede = middleware.requerirAlcanceSede();
      checkSede(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('se requiere especificar la sede') })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
