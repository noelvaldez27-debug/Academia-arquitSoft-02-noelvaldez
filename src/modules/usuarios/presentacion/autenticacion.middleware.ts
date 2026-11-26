import { Request, Response, NextFunction } from 'express';
import { ServicioToken } from '../aplicacion/servicio-token.port';
import { UsuarioRepository, RolUsuario, AlcanceAdministrador } from '../dominio';

export interface UsuarioAutenticadoRequest {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  sedeId: string | null;
  carrera: string | null;
  alcanceAdministrador: AlcanceAdministrador | null;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticadoRequest;
    }
  }
}

/**
 * Middleware de autenticación y autorización por rol y por sede (AC04, ADR-007, RC15, CA-U06).
 * En cada petición comprueba que el usuario siga activo y toma su rol y su sede actuales
 * de la base de datos, garantizando que cambios inmediatos surtan efecto sin esperar expiración del JWT.
 */
export class MiddlewareAutenticacion {
  constructor(
    private readonly servicioToken: ServicioToken,
    private readonly usuarioRepository: UsuarioRepository
  ) {}

  public autenticar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Acceso no autorizado: token no proporcionado.' });
      return;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      res.status(401).json({ error: 'Acceso no autorizado: token vacio.' });
      return;
    }

    try {
      const payload = await this.servicioToken.verificarToken(token);
      const usuario = await this.usuarioRepository.buscarPorId(payload.id);

      if (!usuario || !usuario.activo) {
        res.status(401).json({ error: 'Acceso no autorizado: cuenta inactiva o inexistente.' });
        return;
      }

      if ((payload.versionSesion ?? 0) !== usuario.versionSesion) {
        res.status(401).json({ error: 'Acceso no autorizado: sesión revocada.' });
        return;
      }

      req.usuario = {
        id: usuario.id ?? payload.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        activo: usuario.activo,
        sedeId: usuario.sedeId ?? null,
        carrera: usuario.carrera ?? null,
        alcanceAdministrador: usuario.alcanceAdministrador ?? null,
      };

      next();
    } catch {
      res.status(401).json({ error: 'Acceso no autorizado: token invalido o expirado.' });
      return;
    }
  };

  public requerirRol = (...rolesPermitidos: RolUsuario[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.usuario) {
        res.status(401).json({ error: 'Acceso no autorizado: debe autenticarse primero.' });
        return;
      }

      if (!rolesPermitidos.includes(req.usuario.rol)) {
        res.status(403).json({ error: 'Acceso denegado: permisos insuficientes para esta accion.' });
        return;
      }

      next();
    };
  };

  public requerirAlcanceSede = (
    obtenerSedeObjetivo?: (req: Request) => string | undefined | null
  ) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.usuario) {
        res.status(401).json({ error: 'Acceso no autorizado.' });
        return;
      }

      if (
        req.usuario.rol === RolUsuario.Administrador &&
        req.usuario.alcanceAdministrador === AlcanceAdministrador.General
      ) {
        next();
        return;
      }

      if (
        req.usuario.rol === RolUsuario.Administrador &&
        req.usuario.alcanceAdministrador === AlcanceAdministrador.Sede
      ) {
        const sedeObjetivo = obtenerSedeObjetivo
          ? obtenerSedeObjetivo(req)
          : (req.params.sedeId || req.body.sedeId || (req.query.sedeId as string));

        if (!sedeObjetivo || sedeObjetivo.trim() === '') {
          res.status(400).json({ error: 'Error de validacion: se requiere especificar la sede.' });
          return;
        }

        if (req.usuario.sedeId?.toLowerCase() !== sedeObjetivo.trim().toLowerCase()) {
          res.status(403).json({ error: 'Acceso denegado: solo puede gestionar recursos de su propia sede.' });
          return;
        }

        next();
        return;
      }

      res.status(403).json({ error: 'Acceso denegado.' });
    };
  };
}
