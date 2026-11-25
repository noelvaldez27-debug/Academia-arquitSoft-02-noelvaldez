import type { ChannelModel } from 'amqplib';
import type { Pool } from 'pg';
import { ProcesarResultadoUseCase } from './aplicacion/procesar-resultado.use-case';
import type { ClaveRespuestasPort, ExamenesFinalizadosPort } from './dominio/fuentes-resultado.port';
import { PostgresResultadoRepository } from './infraestructura/postgres-resultado-repository';
import { ResultadoWorker } from './infraestructura/resultado.worker';

export function iniciarWorkerResultados(
  pool: Pool, examenes: ExamenesFinalizadosPort, claves: ClaveRespuestasPort, conectar: () => Promise<ChannelModel>,
): Promise<never> {
  const procesar = new ProcesarResultadoUseCase(new PostgresResultadoRepository(pool), examenes, claves);
  return new ResultadoWorker(conectar, id => procesar.ejecutar(id),
    (mensaje, id) => console.error(mensaje, id ?? '')).ejecutar();
}
