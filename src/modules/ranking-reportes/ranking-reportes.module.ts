import type { Pool } from 'pg';
import type { RendicionModule } from '../rendicion-examen';
import type { ConsultaResultadosInterna } from '../resultados';
import { ActualizarRankingUseCase } from './aplicacion/actualizar-ranking.use-case';
import { PostgresRankingRepository } from './infraestructura/postgres-ranking-repository';
import { detectarCambiosRanking } from './aplicacion/detectar-cambios-ranking';
import { RankingWorker } from './infraestructura/ranking.worker';
import { crearConexionRabbitMQ } from '../../compartido/infraestructura';
import type { MiddlewareAutenticacion } from '../usuarios';
import { ConsultarRankingUseCase } from './aplicacion/consultar-ranking.use-case';
import { crearRutasRanking } from './presentacion/ranking.routes';
import { ConsultarReporteUseCase } from './aplicacion/consultar-reporte.use-case';
import { exportarReporteExcel, tipoExcel } from './infraestructura/exportar-reporte-excel';
import { crearRutasReportes } from './presentacion/reportes.routes';

export class RankingReportesModule {
  readonly rutas;
  readonly repositorio;
  readonly actualizar;
  private readonly worker;

  constructor(pool: Pool, rendicion: RendicionModule['consultasReportes'], resultados: ConsultaResultadosInterna,
    auth: MiddlewareAutenticacion, cursosAsignados: (id: string) => Promise<string[]>) {
    this.repositorio = new PostgresRankingRepository(pool);
    this.rutas = crearRutasRanking(new ConsultarRankingUseCase(id => this.repositorio.consultar(id)), auth);
    this.rutas.use(crearRutasReportes(
      new ConsultarReporteUseCase(id => this.repositorio.consultar(id), cursosAsignados, rendicion.padron),
      exportarReporteExcel, tipoExcel,
    ));
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
    this.worker = new RankingWorker(crearConexionRabbitMQ, async () => {
      const [intentos, calificaciones, proyecciones] = await Promise.all([
        rendicion.estados(), resultados.totalesPorSimulacro(), this.repositorio.estados(),
      ]);
      return detectarCambiosRanking(intentos, calificaciones, proyecciones);
    }, id => this.actualizar.ejecutar(id), error => {
      console.error('Actualización de ranking pendiente.', error instanceof Error ? error.name : 'Error');
    });
  }

  iniciarTrabajos(): void {
    void this.worker.ejecutar();
  }
}
