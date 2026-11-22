import { Request, Response } from 'express';
import { RegistrarEstudianteUseCase } from '../aplicacion/registrar-estudiante.use-case';
import { RegistrarDocenteUseCase } from '../aplicacion/registrar-docente.use-case';
import { IniciarSesionUseCase } from '../aplicacion/iniciar-sesion.use-case';
import { CambiarPasswordUseCase } from '../aplicacion/cambiar-password.use-case';
import {
  ErrorValidacion,
  ErrorConflicto,
  ErrorAccesoDenegado,
  ErrorNoAutenticado,
  ErrorAutenticacion,
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
    private readonly cambiarPasswordUseCase: CambiarPasswordUseCase
  ) {}

  public registrarEstudiante = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre, dni, sedeId, carrera } = req.body ?? {};
      const estudiante = await this.registrarEstudianteUseCase.ejecutar({
        nombre,
        dni,
        sedeId,
        carrera,
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

  private manejarError(error: unknown, res: Response): void {
    if (error instanceof ErrorValidacion) {
      res.status(400).json({ error: error.message });
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
