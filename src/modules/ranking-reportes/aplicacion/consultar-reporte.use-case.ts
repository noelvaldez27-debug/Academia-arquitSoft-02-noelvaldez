import type { AmbitoRanking } from '../dominio/clasificacion';
import type { ProyeccionRanking } from '../dominio/proyeccion-ranking';
import { ActorRanking, ErrorConsultaRanking, limitarAmbito, seleccionarFilas } from './consultar-ranking.use-case';

export interface FiltrosReporte extends AmbitoRanking {
  condicion?: 'MATRICULADO' | 'LIBRE' | 'NO_DETERMINADA';
  desde?: string;
  hasta?: string;
}

export type TipoReporte = 'participacion' | 'resultados' | 'meritos';

export class ConsultarReporteUseCase {
  constructor(
    private readonly consultar: (id: string) => Promise<ProyeccionRanking | null>,
    private readonly cursosAsignados: (id: string) => Promise<string[]>,
  ) {}

  async administrativo(actor: ActorRanking, simulacroId: string, filtros: FiltrosReporte, tipo: TipoReporte) {
    const ambito = limitarAmbito(actor, { carrera: filtros.carrera, sedeId: filtros.sedeId });
    const proyeccion = await this.obtener(simulacroId);
    const estado = proyeccion.definitiva ? 'DEFINITIVO' : 'PROVISIONAL';
    const intentos = this.intentosFiltrados(proyeccion, { ...filtros, ...ambito });
    const resultados = new Map(proyeccion.calificaciones.map(nota => [nota.examenId, nota]));
    const intentosPorId = new Map(intentos.map(intento => [intento.id, intento]));
    const filas = seleccionarFilas(proyeccion, ambito).flatMap(fila => {
      const intento = intentosPorId.get(fila.examenId);
      const nota = resultados.get(fila.examenId);
      if (!intento || !nota) return [];
      return [{
        simulacroId, postulanteId: fila.postulanteId, carrera: intento.carrera, sedeId: intento.sedeId,
        condicion: intento.condicion ?? 'NO_DETERMINADA', puntaje: fila.puntajeCentesimos / 100,
        correctas: nota.correctas, incorrectas: nota.incorrectas, omitidas: nota.omitidas, puesto: fila.puesto, estado,
      }];
    });
    if (tipo !== 'participacion') return { simulacroId, estado, filas };
    const finalizados = intentos.filter(intento => intento.cierre !== null).length;
    return { simulacroId, estado, resumen: {
      inscritos: null, participantes: intentos.length, enCurso: intentos.length - finalizados,
      finalizados, calificados: filas.length,
    } };
  }

  async docente(actor: ActorRanking, simulacroId: string, cursoId: string) {
    if (actor.rol !== 'docente' || !(await this.cursosAsignados(actor.id)).includes(cursoId)) {
      throw new ErrorConsultaRanking(403, 'El curso solicitado no está asignado al docente.');
    }
    const proyeccion = await this.obtener(simulacroId);
    const resumen = { calificados: 0, correctas: 0, incorrectas: 0, omitidas: 0 };
    for (const nota of proyeccion.calificaciones) {
      const curso = nota.porCurso.find(item => item.cursoId === cursoId);
      if (!curso) continue;
      resumen.calificados++;
      resumen.correctas += curso.correctas;
      resumen.incorrectas += curso.incorrectas;
      resumen.omitidas += curso.omitidas;
    }
    return { simulacroId, cursoId, definitiva: proyeccion.definitiva, resumen };
  }

  private async obtener(id: string) {
    const proyeccion = await this.consultar(id);
    if (!proyeccion) throw new ErrorConsultaRanking(404, 'Reporte no disponible.');
    return proyeccion;
  }

  private intentosFiltrados(proyeccion: ProyeccionRanking, filtros: FiltrosReporte) {
    return proyeccion.intentos.filter(intento =>
      (!filtros.carrera || intento.carrera === filtros.carrera) &&
      (!filtros.sedeId || intento.sedeId === filtros.sedeId) &&
      (!filtros.condicion || (intento.condicion ?? 'NO_DETERMINADA') === filtros.condicion) &&
      (!filtros.desde || intento.inicio >= filtros.desde) &&
      (!filtros.hasta || intento.inicio <= filtros.hasta));
  }
}
