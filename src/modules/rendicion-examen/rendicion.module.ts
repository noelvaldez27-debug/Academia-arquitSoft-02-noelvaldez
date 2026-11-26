import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { BancoPreguntasModule, ErrorBancoPreguntas } from '../banco-preguntas';
import { MiddlewareAutenticacion, RolUsuario, ServicioConsultaUsuarios } from '../usuarios';
import { crearConexionRabbitMQ } from '../../compartido/infraestructura';
import { ConsultarExamenUseCase } from './aplicacion/consultar-examen.use-case';
import { ExpirarExamenes } from './aplicacion/expirar-examenes';
import { FinalizarExamenUseCase } from './aplicacion/finalizar-examen.use-case';
import { IniciarExamenUseCase } from './aplicacion/iniciar-examen.use-case';
import { RegistrarRespuestaUseCase } from './aplicacion/registrar-respuesta.use-case';
import { ErrorRendicion } from './dominio/error-rendicion';
import { DespacharExamenes } from './infraestructura/despachar-examenes';
import { PostgresExamenRepository } from './infraestructura/postgres-examen-repository';
import { RabbitmqExamenAdapter } from './infraestructura/rabbitmq-examen.adapter';
import { RedisRespuestasAdapter } from './infraestructura/redis-respuestas.adapter';
import { crearTransaccionExamen } from './infraestructura/transaccion-examen';
import { ExamenController } from './presentacion/examen.controller';
import { crearRutasExamen } from './presentacion/examen.routes';
import { crearRutasCierreSimulacro } from './presentacion/cierre-simulacro.routes';
import { PostgresCierreSimulacro } from './infraestructura/postgres-cierre-simulacro';
import { CompletarCierreSimulacro } from './aplicacion/cerrar-simulacro.use-case';
import { PostgresPadronSimulacro } from './infraestructura/postgres-padron-simulacro';

export class RendicionModule {
  readonly rutas;
  readonly examenesFinalizados;
  readonly consultasReportes;
  private readonly expirar: ExpirarExamenes;
  private readonly despachar: DespacharExamenes;
  private readonly cierres: PostgresCierreSimulacro;

  constructor(pool: Pool, redis: Redis, banco: Pick<BancoPreguntasModule, 'consultasVersionadas' | 'existeSimulacro'>,
    auth: MiddlewareAutenticacion, usuarios?: ServicioConsultaUsuarios,
    habilitar?: Parameters<typeof crearTransaccionExamen>[2], fuentesPadron?: Parameters<typeof crearTransaccionExamen>[3]) {
    const reloj = () => new Date();
    const examenes = new PostgresExamenRepository(pool);
    this.cierres = new PostgresCierreSimulacro(pool);
    const temporales = new RedisRespuestasAdapter(redis);
    const transaccion = crearTransaccionExamen(pool, (bd, despuesDeConfirmar) => {
      const consultas = banco.consultasVersionadas(bd, despuesDeConfirmar);
      return async id => {
        try {
          return await consultas.consultar(id);
        } catch (error) {
          if (error instanceof ErrorBancoPreguntas && (error.tipo === 'conflicto' || error.tipo === 'no-encontrado')) {
            throw new ErrorRendicion(error.tipo, error.message);
          }
          throw error;
        }
      };
    }, habilitar, fuentesPadron);
    const finalizar = new FinalizarExamenUseCase(transaccion, temporales, reloj);
    const controlador = new ExamenController(
      new IniciarExamenUseCase(transaccion, reloj, randomUUID, id => temporales.inicializar(id), async id => {
        const usuario = await usuarios?.consultarPorId(id);
        return { carrera: usuario?.carrera ?? null, sedeId: usuario?.sedeId ?? null, condicion: usuario?.condicion ?? null };
      }),
      new ConsultarExamenUseCase(transaccion, temporales, reloj),
      new RegistrarRespuestaUseCase(transaccion, temporales, reloj),
      finalizar,
    );
    this.rutas = crearRutasCierreSimulacro(auth, transaccion, banco.existeSimulacro);
    this.rutas.use(crearRutasExamen(controlador, auth.autenticar, auth.requerirRol(RolUsuario.Postulante)));
    this.examenesFinalizados = { consultar: (id: string) => examenes.consultarFinalizado(id) };
    this.consultasReportes = {
      porSimulacro: (id: string, despues?: string) => examenes.listarParaReportes(id, despues),
      consultarCierre: (id: string) => this.cierres.consultar(id),
      estados: () => examenes.estadoParaReportes(),
      padron: (id: string) => new PostgresPadronSimulacro(pool).listar(id),
    };
    this.expirar = new ExpirarExamenes(examenes, finalizar, reloj, informarError);
    this.despachar = new DespacharExamenes(pool, new RabbitmqExamenAdapter(crearConexionRabbitMQ), temporales);
  }

  iniciarTrabajos(contarCalificados: (ids: string[]) => Promise<number>): void {
    programar(() => this.expirar.ejecutar(100));
    programar(() => this.despachar.ejecutar(100));
    const completar = new CompletarCierreSimulacro(
      this.consultasReportes.porSimulacro, contarCalificados, id => this.cierres.completar(id),
    );
    programar(async () => {
      for (const id of await this.cierres.pendientes()) {
        await completar.ejecutar(id).catch(informarError);
      }
    });
  }
}

function informarError(error: unknown): void {
  console.error('Trabajo pendiente de Rendición.', error instanceof Error ? error.name : 'Error');
}

function programar(trabajo: () => Promise<void>): void {
  const ejecutar = () => {
    void trabajo().catch(informarError).finally(() => setTimeout(ejecutar, 1000).unref());
  };
  ejecutar();
}
