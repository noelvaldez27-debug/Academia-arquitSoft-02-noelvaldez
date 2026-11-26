import { Request, Response } from 'express';
import { RegistrarEstudianteUseCase } from '../aplicacion/registrar-estudiante.use-case';
import { RegistrarDocenteUseCase } from '../aplicacion/registrar-docente.use-case';
import { IniciarSesionUseCase } from '../aplicacion/iniciar-sesion.use-case';
import { CambiarPasswordUseCase } from '../aplicacion/cambiar-password.use-case';
import { CambiarCorreoUseCase } from '../aplicacion/cambiar-correo.use-case';
import { ListarUsuariosUseCase } from '../aplicacion/listar-usuarios.use-case';
import { DesactivarUsuarioUseCase } from '../aplicacion/desactivar-usuario.use-case';
import { ReactivarUsuarioUseCase } from '../aplicacion/reactivar-usuario.use-case';
import { RegistrarAdministradorSedeUseCase } from '../aplicacion/registrar-administrador-sede.use-case';
import { ListarSedesUseCase } from '../aplicacion/listar-sedes.use-case';
import { CrearSedeUseCase } from '../aplicacion/crear-sede.use-case';
import {
  ErrorValidacion,
  ErrorConflicto,
  ErrorAccesoDenegado,
  ErrorNoAutenticado,
  ErrorAutenticacion,
  ErrorNoEncontrado,
} from '../dominio';

/**
 * Controlador de presentación para gestión de usuarios (ADR-002, ADR-008).
 * Traduce peticiones HTTP a comandos de aplicación y desacopla errores de dominio a códigos HTTP.
 * Garantiza que nunca se retornen contraseñas ni hashes en respuestas (AC04).
 */
export class UsuarioController {
  constructor(
    private readonly registrarEstudianteUseCase: RegistrarEstudianteUseCase,
    private readonly registrarDocenteUseCase: RegistrarDocenteUseCase,
    private readonly iniciarSesionUseCase: IniciarSesionUseCase,
    private readonly cambiarPasswordUseCase: CambiarPasswordUseCase,
    private readonly cambiarCorreoUseCase: CambiarCorreoUseCase,
    private readonly listarUsuariosUseCase: ListarUsuariosUseCase,
    private readonly desactivarUsuarioUseCase: DesactivarUsuarioUseCase,
    private readonly reactivarUsuarioUseCase: ReactivarUsuarioUseCase,
    private readonly registrarAdministradorSedeUseCase: RegistrarAdministradorSedeUseCase,
    private readonly listarSedesUseCase: ListarSedesUseCase,
    private readonly crearSedeUseCase: CrearSedeUseCase
  ) {}

  public registrarEstudiante = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre, dni, sedeId, carrera, condicion, cicloId } = req.body ?? {};
      const estudiante = await this.registrarEstudianteUseCase.ejecutar({
        nombre,
        dni,
        sedeId,
        carrera,
        condicion,
        cicloId,
        ejecutor: req.usuario
          ? {
              id: req.usuario.id,
              rol: req.usuario.rol,
              sedeId: req.usuario.sedeId,
              alcanceAdministrador: req.usuario.alcanceAdministrador,
            }
          : undefined,
      });

      res.status(201).json({
        id: estudiante.id,
        nombre: estudiante.nombre,
        dni: estudiante.dni,
        correo: estudiante.correo,
        rol: estudiante.rol,
        sedeId: estudiante.sedeId,
        carrera: estudiante.carrera,
        condicion: estudiante.condicion,
        activo: estudiante.activo,
      });
    } catch (error) {
      this.manejarError(error, res);
    }
  };

  public registrarDocente = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre, dni } = req.body ?? {};
      const docente = await this.registrarDocenteUseCase.ejecutar({
        nombre,
        dni,
        ejecutor: req.usuario
          ? {
              id: req.usuario.id,
              rol: req.usuario.rol,
              sedeId: req.usuario.sedeId,
              alcanceAdministrador: req.usuario.alcanceAdministrador,
            }
          : undefined,
      });

      res.status(201).json({
        id: docente.id,
        nombre: docente.nombre,
        dni: docente.dni,
        correo: docente.correo,
        rol: docente.rol,
        activo: docente.activo,
      });
    } catch (error) {
      this.manejarError(error, res);
    }
  };

  public iniciarSesion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { correo, password } = req.body ?? {};
      const resultado = await this.iniciarSesionUseCase.ejecutar({
        correo,
        password,
      });

      res.status(200).json(resultado);
    } catch {
      // Seguridad AC04 y CA-U05: ante cualquier error en login, responder el mismo mensaje genérico
      res.status(401).json({ error: 'Credenciales invalidas.' });
    }
  };

  public cambiarPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.usuario) {
        res.status(401).json({ error: 'Acceso no autorizado: debe iniciar sesion.' });
        return;
      }

      const { passwordActual, passwordNueva } = req.body ?? {};
      await this.cambiarPasswordUseCase.ejecutar({
        usuarioId: req.usuario.id,
        passwordActual,
        passwordNueva,
      });

      res.status(200).json({ mensaje: 'Contrasena actualizada con exito.' });
    } catch (error) {
      this.manejarError(error, res);
    }
  };

  public cambiarCorreo = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.usuario) {
        res.status(401).json({ error: 'Acceso no autorizado: debe iniciar sesion.' });
        return;
      }

      const { nuevoCorreo, passwordActual } = req.body ?? {};
      await this.cambiarCorreoUseCase.ejecutar({
        usuarioId: req.usuario.id,
        nuevoCorreo,
        passwordActual,
      });

      res.status(200).json({ mensaje: 'Correo actualizado con exito.' });
    } catch (error) {
      this.manejarError(error, res);
    }
  };

  public listarUsuarios = async (req: Request, res: Response): Promise<void> => {
    try {
      const { rol, sedeId, pagina, limite, archivados, q } = req.query;
      if (q !== undefined && (typeof q !== 'string' || q.trim().length > 160)) {
        res.status(400).json({ error: 'La búsqueda debe tener hasta 160 caracteres.' });
        return;
      }
      if (archivados !== undefined && archivados !== 'true' && archivados !== 'false') {
        res.status(400).json({ error: 'archivados debe ser true o false.' });
        return;
      }
      const resultado = await this.listarUsuariosUseCase.ejecutar({
        rol: rol as any,
        sedeId: sedeId ? String(sedeId) : undefined,
        pagina: pagina ? parseInt(String(pagina), 10) : undefined,
        limite: limite ? parseInt(String(limite), 10) : undefined,
        ...(archivados === 'true' && { soloArchivados: true }),
        ...(typeof q === 'string' && q.trim() && { q: q.trim() }),
        ejecutor: req.usuario
          ? {
              id: req.usuario.id,
              rol: req.usuario.rol,
              sedeId: req.usuario.sedeId,
              alcanceAdministrador: req.usuario.alcanceAdministrador,
            }
          : undefined,
      });

      res.status(200).json(resultado);
    } catch (error) {
      this.manejarError(error, res);
    }
  };

  public desactivarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioId = req.params.id as string;
      await this.desactivarUsuarioUseCase.ejecutar({
        usuarioId,
        ejecutor: req.usuario
          ? {
              id: req.usuario.id,
              rol: req.usuario.rol,
              sedeId: req.usuario.sedeId,
              alcanceAdministrador: req.usuario.alcanceAdministrador,
            }
          : undefined,
      });

      res.status(200).json({ mensaje: 'Usuario desactivado con exito.' });
    } catch (error) {
      this.manejarError(error, res);
    }
  };

  public reactivarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
      const usuarioId = req.params.id as string;
      await this.reactivarUsuarioUseCase.ejecutar({
        usuarioId,
        ejecutor: req.usuario
          ? {
              id: req.usuario.id,
              rol: req.usuario.rol,
              sedeId: req.usuario.sedeId,
              alcanceAdministrador: req.usuario.alcanceAdministrador,
            }
          : undefined,
      });

      res.status(200).json({ mensaje: 'Usuario reactivado con exito.' });
    } catch (error) {
      this.manejarError(error, res);
    }
  };

  public registrarAdministradorSede = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre, correo, passwordInicial, sedeId } = req.body ?? {};
      const adminSede = await this.registrarAdministradorSedeUseCase.ejecutar({
        nombre,
        correo,
        passwordInicial,
        sedeId,
        ejecutor: req.usuario
          ? {
              id: req.usuario.id,
              rol: req.usuario.rol,
              sedeId: req.usuario.sedeId,
              alcanceAdministrador: req.usuario.alcanceAdministrador,
            }
          : undefined,
      });

      res.status(201).json({
        id: adminSede.id,
        nombre: adminSede.nombre,
        correo: adminSede.correo,
        rol: adminSede.rol,
        alcanceAdministrador: adminSede.alcanceAdministrador,
        sedeId: adminSede.sedeId,
        activo: adminSede.activo,
      });
    } catch (error) {
      this.manejarError(error, res);
    }
  };

  public listarSedes = async (req: Request, res: Response): Promise<void> => {
    try {
      const sedes = await this.listarSedesUseCase.ejecutar({
        ejecutor: req.usuario
          ? {
              id: req.usuario.id,
              rol: req.usuario.rol,
              sedeId: req.usuario.sedeId,
              alcanceAdministrador: req.usuario.alcanceAdministrador,
            }
          : undefined,
      });

      res.status(200).json(
        sedes.map((s) => ({
          id: s.id,
          nombre: s.nombre,
        }))
      );
    } catch (error) {
      this.manejarError(error, res);
    }
  };

  public crearSede = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre } = req.body ?? {};
      const sede = await this.crearSedeUseCase.ejecutar({
        nombre,
        ejecutor: req.usuario
          ? {
              id: req.usuario.id,
              rol: req.usuario.rol,
              sedeId: req.usuario.sedeId,
              alcanceAdministrador: req.usuario.alcanceAdministrador,
            }
          : undefined,
      });

      res.status(201).json({
        id: sede.id,
        nombre: sede.nombre,
      });
    } catch (error) {
      this.manejarError(error, res);
    }
  };

  private manejarError(error: unknown, res: Response): void {
    if (error instanceof ErrorValidacion) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof ErrorNoEncontrado) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof ErrorConflicto) {
      res.status(409).json({ error: error.message });
      return;
    }
    if (error instanceof ErrorAccesoDenegado) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error instanceof ErrorNoAutenticado || error instanceof ErrorAutenticacion) {
      res.status(401).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
