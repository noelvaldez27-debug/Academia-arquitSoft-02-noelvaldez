import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import type { ServicioIA } from '../../compartido/aplicacion/servicio-ia';
import { crearConsultaNombresCursos, crearConsultaPreguntasHistoricas } from '../banco-preguntas';
import { crearConsultaIntentosCerrados } from '../rendicion-examen';
import type { ConsultaResultadosInterna } from '../resultados';
import type { MiddlewareAutenticacion } from '../usuarios';
import { ConsultarHistorialUseCase } from './aplicacion/consultar-historial.use-case';
import { ConsultarEstadisticasUseCase } from './aplicacion/consultar-estadisticas.use-case';
import { GenerarRecomendacionUseCase } from './aplicacion/generar-recomendacion.use-case';
import { PostgresRecomendacionRepository } from './infraestructura/postgres-recomendacion-repository';
import { crearRutasAnalitica } from './presentacion/analitica.routes';

export class AnaliticaModule {
  readonly rutas;

  constructor(pool: Pool, auth: MiddlewareAutenticacion,
    resultados: ConsultaResultadosInterna & { paraAnalitica: ConstructorParameters<typeof ConsultarEstadisticasUseCase>[0] },
    cursosAsignados: (id: string) => Promise<string[]>,
    ia?: Pick<ServicioIA, 'recomendar'>) {
    const intentos = crearConsultaIntentosCerrados(pool);
    const preguntas = crearConsultaPreguntasHistoricas(pool);
    const historial = new ConsultarHistorialUseCase(resultados.porPostulante, intentos);
    const recomendacion = new GenerarRecomendacionUseCase(
      historial, new PostgresRecomendacionRepository(pool),
      ids => createHash('sha256').update(JSON.stringify(ids)).digest('hex'),
      crearConsultaNombresCursos(pool), preguntas,
      ia && (cursos => ia.recomendar(cursos.map(curso => curso.nombre),
        cursos.map(({ desempeno, temas }) => ({ desempeno, temas })))),
      () => console.error('Fallo del proveedor de recomendaciones de Analitica.'),
    );
    const estadisticas = new ConsultarEstadisticasUseCase(resultados.paraAnalitica, intentos, preguntas, cursosAsignados);
    this.rutas = crearRutasAnalitica(auth, historial, recomendacion, estadisticas);
  }
}
