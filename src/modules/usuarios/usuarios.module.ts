import { CambiarCondicionUseCase } from './aplicacion/cambiar-condicion.use-case';
import { PostgresCargaMasivaRepository } from './infraestructura/postgres-carga-masiva-repository';
import { ListarCargasMasivasUseCase } from './aplicacion/listar-cargas-masivas.use-case';
import { ConsultarCargaMasivaUseCase } from './aplicacion/consultar-carga-masiva.use-case';
import { crearRutasCargaMasiva } from './presentacion/carga-masiva.routes';
import { randomUUID } from 'node:crypto';
import { PostgresCargaMasivaAdapter } from './infraestructura/postgres-carga-masiva.adapter';
import { RabbitmqCargaMasivaWorker } from './infraestructura/rabbitmq-carga-masiva.worker';
import { PrepararCargaMasivaUseCase } from './aplicacion/preparar-carga-masiva.use-case';
import { ProcesarCargaMasivaUseCase } from './aplicacion/procesar-carga-masiva.use-case';
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
import { RegistrarAdministradorSedeUseCase } from './aplicacion/registrar-administrador-sede.use-case';
import { ListarSedesUseCase } from './aplicacion/listar-sedes.use-case';
import { CrearSedeUseCase } from './aplicacion/crear-sede.use-case';
import { ConsultarUsuarioUseCase } from './aplicacion/consultar-usuario.use-case';
import { ServicioConsultaUsuarios } from './aplicacion/consultar-usuario.port';
import { UsuarioController } from './presentacion/usuario.controller';
import { MiddlewareAutenticacion } from './presentacion/autenticacion.middleware';
import { crearRutasUsuario } from './presentacion/usuario.routes';
import { CredencialesProvisionales } from './infraestructura/credenciales-provisionales';
import { PostgresEntregaCredenciales } from './infraestructura/postgres-entrega-credenciales';
import { crearRutasEntregaCredenciales } from './presentacion/credenciales.routes';
import { PostgresArchivarPostulantes } from './infraestructura/postgres-archivar-postulantes';
import type { ConsultarActivos } from './infraestructura/postgres-archivar-postulantes';
import { crearRutasArchivado } from './presentacion/archivado.routes';
import { enTransaccionUsuarios, PostgresRegistroCiclo } from './infraestructura/postgres-registro-ciclo';
import { PostgresCiclosAcademicos } from './infraestructura/postgres-ciclos-academicos';
import { crearRutasCiclos } from './presentacion/ciclos.routes';
import { leerYValidarExcel } from './infraestructura/leer-excel';
import { resolverPasswordInicialDni } from './infraestructura/politica-password-inicial';
import { GeneradorPasswordTemporal } from './infraestructura/generador-password-temporal';
import { PostgresRestablecerPassword } from './infraestructura/postgres-restablecer-password';
import { RestablecerPasswordUseCase } from './aplicacion/restablecer-password.use-case';
import { crearRutasRestablecerPassword } from './presentacion/restablecer-password.routes';
import { PostgresConsultarHistorialCredenciales } from './infraestructura/postgres-consultar-historial-credenciales';
import { ConsultarHistorialCredencialesUseCase } from './aplicacion/consultar-historial-credenciales.use-case';
import { crearRutasHistorialCredenciales } from './presentacion/historial-credenciales.routes';

import type { CacheConsultas } from '../../compartido/aplicacion/cache-consultas.port';

export interface ConfigModuloUsuarios {
  cacheConsultas?: CacheConsultas;
  pool: Pool;
  jwtSecret?: string;
  jwtDuracion?: string;
  consultarIntentosActivos?: ConsultarActivos;
  consultarSimulacrosPorCerrar?: (bd: Pick<Pool, 'query'>, cicloId: string) => Promise<boolean>;
  passwordInicialDni?: boolean;
}

/**
 * Raíz de composición del módulo Gestión de Usuarios (ADR-001, ADR-002).
 * Conecta casos de uso, repositorios y adaptadores mediante inyección de dependencias.
 */
export class UsuariosModule {
  public readonly prepararCargaMasiva: PrepararCargaMasivaUseCase;
  public readonly consumidorCargaMasiva: RabbitmqCargaMasivaWorker;
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
  public readonly registrarAdministradorSedeUseCase: RegistrarAdministradorSedeUseCase;
  public readonly listarSedesUseCase: ListarSedesUseCase;
  public readonly crearSedeUseCase: CrearSedeUseCase;
  public readonly consultarUsuarioUseCase: ConsultarUsuarioUseCase;
  public readonly servicioConsultaUsuarios: ServicioConsultaUsuarios;
  public readonly controller: UsuarioController;

  constructor(config: ConfigModuloUsuarios) {
    const usuarioRepo = new PostgresUsuarioRepository(config.pool);
    const sedeRepo = new PostgresSedeRepository(config.pool, config.cacheConsultas);
    const hashAdapter = new BcryptjsHashAdapter();
    const tokenAdapter = new JsonWebTokenAdapter({
      secret: config.jwtSecret,
      duracion: config.jwtDuracion,
    });
    const generadorCredenciales = new GeneradorCredenciales(hashAdapter);
    const passwordInicialDni = resolverPasswordInicialDni(
      config.passwordInicialDni ?? process.env.USUARIOS_PASSWORD_INICIAL_DNI,
    );
    const provisionales = new CredencialesProvisionales(
      (config.jwtSecret ?? process.env.JWT_SECRET!).trim(), hashAdapter, passwordInicialDni,
    );

    const persistenciaCarga = new PostgresCargaMasivaAdapter(config.pool, generadorCredenciales, provisionales);
    const maxMb = Number(process.env.CARGA_MASIVA_MAX_MB) || 10;
    this.prepararCargaMasiva = new PrepararCargaMasivaUseCase(persistenciaCarga, sedeRepo, randomUUID, {
      maxMb,
      maxFilas: Number(process.env.CARGA_MASIVA_MAX_FILAS) || 10000,
    }, leerYValidarExcel);
    this.consumidorCargaMasiva = new RabbitmqCargaMasivaWorker(
      config.pool, new ProcesarCargaMasivaUseCase(persistenciaCarga),
    );

    this.registrarEstudianteUseCase = new RegistrarEstudianteUseCase(
      usuarioRepo,
      sedeRepo,
      generadorCredenciales,
      (administradorId, cargaId, dni, tipo) => tipo === 'INICIAL' && dni
        ? provisionales.emitirInicial(administradorId, dni, cargaId)
        : provisionales.emitir(administradorId, cargaId),
      (cicloId, postulante, actor, emision) => enTransaccionUsuarios(config.pool,
        bd => new PostgresRegistroCiclo(bd).guardar(cicloId, postulante, actor, emision)),
      (cicloId, datos, actor, emitirCredenciales) => enTransaccionUsuarios(config.pool,
        bd => new PostgresRegistroCiclo(bd).ejecutarAutomaticoDesdeDatos(cicloId, { ...datos, condicion: datos.condicion ?? null }, actor, emitirCredenciales)),
    );
    this.registrarEstudianteUseCase.modoAutomatico = async (cicloId, datos, actor, cargaId) => {
      const resultado = await enTransaccionUsuarios(config.pool, bd => new PostgresRegistroCiclo(bd)
        .ejecutarAutomaticoDesdeDatos(cicloId, { ...datos, condicion: datos.condicion ?? null }, actor,
          tipo => tipo === 'INICIAL'
            ? provisionales.emitirInicial(actor.id, datos.dni, cargaId)
            : provisionales.emitir(actor.id, cargaId)));
      return { resultado: resultado.resultado };
    };
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
    const archivado = config.consultarIntentosActivos &&
      new PostgresArchivarPostulantes(config.pool, config.consultarIntentosActivos);
    this.desactivarUsuarioUseCase = new DesactivarUsuarioUseCase(usuarioRepo, archivado?.ejecutar.bind(archivado));
    this.reactivarUsuarioUseCase = new ReactivarUsuarioUseCase(usuarioRepo, usuarioRepo.reactivarPostulanteAnterior.bind(usuarioRepo));
    this.registrarAdministradorSedeUseCase = new RegistrarAdministradorSedeUseCase(
      usuarioRepo,
      sedeRepo,
      hashAdapter
    );
    this.listarSedesUseCase = new ListarSedesUseCase(sedeRepo);
    this.crearSedeUseCase = new CrearSedeUseCase(sedeRepo);
    this.consultarUsuarioUseCase = new ConsultarUsuarioUseCase(usuarioRepo);
    this.servicioConsultaUsuarios = this.consultarUsuarioUseCase;

    this.middlewareAutenticacion = new MiddlewareAutenticacion(tokenAdapter, usuarioRepo);
    this.controller = new UsuarioController(
      this.registrarEstudianteUseCase,
      this.registrarDocenteUseCase,
      this.iniciarSesionUseCase,
      this.cambiarPasswordUseCase,
      this.cambiarCorreoUseCase,
      this.listarUsuariosUseCase,
      this.desactivarUsuarioUseCase,
      this.reactivarUsuarioUseCase,
      this.registrarAdministradorSedeUseCase,
      this.listarSedesUseCase,
      this.crearSedeUseCase
    );

    this.router = crearRutasUsuario(this.controller, this.middlewareAutenticacion);
    this.router.use(crearRutasRestablecerPassword(this.middlewareAutenticacion,
      new RestablecerPasswordUseCase(new PostgresRestablecerPassword(config.pool),
        new GeneradorPasswordTemporal(), hashAdapter)));
    this.router.use(crearRutasHistorialCredenciales(this.middlewareAutenticacion,
      new ConsultarHistorialCredencialesUseCase(new PostgresConsultarHistorialCredenciales(config.pool))));
    const ciclos = new PostgresCiclosAcademicos(config.pool);
    this.router.use(crearRutasCiclos(this.middlewareAutenticacion, () => ciclos.listar(),
      datos => ciclos.crear(randomUUID(), datos.nombre, datos.iniciaEl, datos.terminaEl),
      (id, actorId) => enTransaccionUsuarios(config.pool, async bd => {
        if (!config.consultarIntentosActivos || !config.consultarSimulacrosPorCerrar) throw new Error('Cierre no disponible.');
        return new PostgresCiclosAcademicos(bd).cerrar(id, actorId,
          config.consultarSimulacrosPorCerrar, config.consultarIntentosActivos);
      })));
    const entregas = new PostgresEntregaCredenciales(config.pool, provisionales);
    this.router.use(crearRutasEntregaCredenciales(this.middlewareAutenticacion, entregas.descargar.bind(entregas)));
    this.router.use(crearRutasArchivado(this.middlewareAutenticacion, archivado?.ejecutar.bind(archivado)));
    const cambiarCondicion = new CambiarCondicionUseCase((id, condicion, sede) =>
      usuarioRepo.cambiarCondicion(id, condicion, sede));
    this.router.patch('/estudiantes/:id/condicion', this.middlewareAutenticacion.autenticar, async (req, res) => {
      const estado = await cambiarCondicion.ejecutar(req.usuario, String(req.params.id), req.body?.condicion);
      res.sendStatus(estado);
    });
    const cargas = new PostgresCargaMasivaRepository(config.pool);
    this.router.use(crearRutasCargaMasiva(
      this.prepararCargaMasiva,
      new ConsultarCargaMasivaUseCase(cargas),
      this.middlewareAutenticacion,
      maxMb,
      new ListarCargasMasivasUseCase(cargas.listar.bind(cargas)),
    ));
  }
}
