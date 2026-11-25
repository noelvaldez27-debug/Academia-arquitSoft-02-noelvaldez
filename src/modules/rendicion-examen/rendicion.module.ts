import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { BancoPreguntasModule, ErrorBancoPreguntas } from '../banco-preguntas';
import { MiddlewareAutenticacion, RolUsuario } from '../usuarios';
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

export class RendicionModule {
  readonly rutas;
  readonly examenesFinalizados;
  private readonly expirar: ExpirarExamenes;
  private readonly despachar: DespacharExamenes;

  constructor(pool: Pool, redis: Redis, banco: Pick<BancoPreguntasModule, 'consultasVersionadas'>, auth: MiddlewareAutenticacion) {
    const reloj = () => new Date();
    const examenes = new PostgresExamenRepository(pool);
    const temporales = new RedisRespuestasAdapter(redis);
    const transaccion = crearTransaccionExamen(pool, bd => {
      const consultas = banco.consultasVersionadas(bd);
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
    });
    const finalizar = new FinalizarExamenUseCase(transaccion, temporales, reloj);
    const controlador = new ExamenController(
      new IniciarExamenUseCase(transaccion, reloj, randomUUID, id => temporales.inicializar(id)),
      new ConsultarExamenUseCase(transaccion, temporales, reloj),
      new RegistrarRespuestaUseCase(transaccion, temporales, reloj),
      finalizar,
    );
    this.rutas = crearRutasExamen(controlador, auth.autenticar, auth.requerirRol(RolUsuario.Postulante));
    this.examenesFinalizados = { consultar: (id: string) => examenes.consultarFinalizado(id) };
    this.expirar = new ExpirarExamenes(examenes, finalizar, reloj, informarError);
    this.despachar = new DespacharExamenes(pool, new RabbitmqExamenAdapter(crearConexionRabbitMQ), temporales);
  }

  iniciarTrabajos(): void {
    programar(() => this.expirar.ejecutar(100));
    programar(() => this.despachar.ejecutar(100));
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
