import { Router } from 'express';
import { Pool } from 'pg';
import { PostgresUsuarioRepository } from './infraestructura/postgres-usuario-repository';
import { PostgresSedeRepository } from './infraestructura/postgres-sede-repository';
import { BcryptjsHashAdapter } from './infraestructura/bcryptjs-hash.adapter';
import { JsonWebTokenAdapter } from './infraestructura/jsonwebtoken-token.adapter';
import { GeneradorCredenciales } from './aplicacion/generar-credenciales';
import { RegistrarEstudianteUseCase } from './aplicacion/registrar-estudiante.use-case';
import { RegistrarDocenteUseCase } from './aplicacion/registrar-docente.use-case';
import { IniciarSesionUseCase } from './aplicacion/iniciar-sesion.use-case';
import { CambiarPasswordUseCase } from './aplicacion/cambiar-password.use-case';
import { CambiarCorreoUseCase } from './aplicacion/cambiar-correo.use-case';
import { ListarUsuariosUseCase } from './aplicacion/listar-usuarios.use-case';
import { DesactivarUsuarioUseCase } from './aplicacion/desactivar-usuario.use-case';
import { ReactivarUsuarioUseCase } from './aplicacion/reactivar-usuario.use-case';
import { UsuarioController } from './presentacion/usuario.controller';
import { MiddlewareAutenticacion } from './presentacion/autenticacion.middleware';
import { crearRutasUsuario } from './presentacion/usuario.routes';

export interface ConfigModuloUsuarios {
  pool: Pool;
  jwtSecret?: string;
  jwtDuracion?: string;
}

/**
 * Raíz de composición del módulo Gestión de Usuarios (ADR-001, ADR-002).
 * Conecta casos de uso, repositorios y adaptadores mediante inyección de dependencias.
 */
export class UsuariosModule {
  public readonly router: Router;
  public readonly middlewareAutenticacion: MiddlewareAutenticacion;
  public readonly registrarEstudianteUseCase: RegistrarEstudianteUseCase;
  public readonly registrarDocenteUseCase: RegistrarDocenteUseCase;
  public readonly iniciarSesionUseCase: IniciarSesionUseCase;
  public readonly cambiarPasswordUseCase: CambiarPasswordUseCase;
  public readonly cambiarCorreoUseCase: CambiarCorreoUseCase;
  public readonly listarUsuariosUseCase: ListarUsuariosUseCase;
  public readonly desactivarUsuarioUseCase: DesactivarUsuarioUseCase;
  public readonly reactivarUsuarioUseCase: ReactivarUsuarioUseCase;
  public readonly controller: UsuarioController;

  constructor(config: ConfigModuloUsuarios) {
    const usuarioRepo = new PostgresUsuarioRepository(config.pool);
    const sedeRepo = new PostgresSedeRepository(config.pool);
    const hashAdapter = new BcryptjsHashAdapter();
    const tokenAdapter = new JsonWebTokenAdapter({
      secret: config.jwtSecret,
      duracion: config.jwtDuracion,
    });
    const generadorCredenciales = new GeneradorCredenciales(hashAdapter);

    this.registrarEstudianteUseCase = new RegistrarEstudianteUseCase(
      usuarioRepo,
      sedeRepo,
      generadorCredenciales
    );
    this.registrarDocenteUseCase = new RegistrarDocenteUseCase(
      usuarioRepo,
      generadorCredenciales
    );
    this.iniciarSesionUseCase = new IniciarSesionUseCase(
      usuarioRepo,
      hashAdapter,
      tokenAdapter
    );
    this.cambiarPasswordUseCase = new CambiarPasswordUseCase(
      usuarioRepo,
      hashAdapter
    );
    this.cambiarCorreoUseCase = new CambiarCorreoUseCase(
      usuarioRepo,
      hashAdapter
    );
    this.listarUsuariosUseCase = new ListarUsuariosUseCase(usuarioRepo);
    this.desactivarUsuarioUseCase = new DesactivarUsuarioUseCase(usuarioRepo);
    this.reactivarUsuarioUseCase = new ReactivarUsuarioUseCase(usuarioRepo);

    this.middlewareAutenticacion = new MiddlewareAutenticacion(tokenAdapter, usuarioRepo);
    this.controller = new UsuarioController(
      this.registrarEstudianteUseCase,
      this.registrarDocenteUseCase,
      this.iniciarSesionUseCase,
      this.cambiarPasswordUseCase,
      this.cambiarCorreoUseCase,
      this.listarUsuariosUseCase,
      this.desactivarUsuarioUseCase,
      this.reactivarUsuarioUseCase
    );

    this.router = crearRutasUsuario(this.controller, this.middlewareAutenticacion);
  }
}
