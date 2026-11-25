import type { Pool } from 'pg';
import type { RendicionModule } from '../rendicion-examen';
import type { ConsultaResultadosInterna } from '../resultados';
import { ActualizarRankingUseCase } from './aplicacion/actualizar-ranking.use-case';
import { PostgresRankingRepository } from './infraestructura/postgres-ranking-repository';

export class RankingReportesModule {
  readonly repositorio;
  readonly actualizar;

  constructor(pool: Pool, rendicion: RendicionModule['consultasReportes'], resultados: ConsultaResultadosInterna) {
    this.repositorio = new PostgresRankingRepository(pool);
    this.actualizar = new ActualizarRankingUseCase({
      cerrado: async id => Boolean((await rendicion.consultarCierre(id))?.cerradoEn),
      intentos: async (id, despues) => (await rendicion.porSimulacro(id, despues)).map(fila => ({
        id: fila.id, postulanteId: fila.postulanteId, carrera: fila.carrera, sedeId: fila.sedeId,
        condicion: fila.condicion, inicio: fila.inicio.toISOString(), cierre: fila.cierre?.toISOString() ?? null,
      })),
      calificaciones: async (id, despues) => (await resultados.porSimulacro(id, despues)).map(
        ({ examenId, puntajeCentesimos, correctas, incorrectas, omitidas, porCurso }) =>
          ({ examenId, puntajeCentesimos, correctas, incorrectas, omitidas, porCurso }),
      ),
    }, this.repositorio);
  }
}
