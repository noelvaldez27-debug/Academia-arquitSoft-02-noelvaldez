import type { AmbitoRanking } from '../dominio/clasificacion';
import type { ProyeccionRanking } from '../dominio/proyeccion-ranking';

export type ActorRanking =
  | { rol: 'postulante' | 'docente' | 'general'; id: string }
  | { rol: 'sede'; id: string; sedeId: string };

export class ErrorConsultaRanking extends Error {
  constructor(readonly estado: 400 | 403 | 404, mensaje: string) { super(mensaje); }
}

export function limitarAmbito(actor: ActorRanking, ambito: AmbitoRanking): AmbitoRanking {
  if (actor.rol === 'general') return ambito;
  if (actor.rol === 'sede' && (!ambito.sedeId || ambito.sedeId === actor.sedeId)) {
    return { ...ambito, sedeId: actor.sedeId };
  }
  throw new ErrorConsultaRanking(403, 'El ámbito solicitado no está autorizado.');
}

export function seleccionarFilas(proyeccion: ProyeccionRanking, ambito: AmbitoRanking) {
  return proyeccion.ambitos.find(grupo => grupo.carrera === (ambito.carrera ?? null)
    && grupo.sedeId === (ambito.sedeId ?? null))?.filas ?? [];
}

export class ConsultarRankingUseCase {
  constructor(private readonly consultar: (id: string) => Promise<ProyeccionRanking | null>) {}

  async propio(actor: ActorRanking, simulacroId: string) {
    if (actor.rol !== 'postulante') throw new ErrorConsultaRanking(403, 'Se requiere el rol postulante.');
    const proyeccion = await this.consultar(simulacroId);
    const intento = proyeccion?.intentos.find(fila => fila.postulanteId === actor.id);
    if (!proyeccion || !intento) throw new ErrorConsultaRanking(404, 'Ranking propio no disponible.');
    const resumen = (ambito: AmbitoRanking) => {
      const filas = seleccionarFilas(proyeccion, ambito);
      return { puesto: filas.find(fila => fila.examenId === intento.id)?.puesto ?? null, participantes: filas.length };
    };
    const nota = proyeccion.calificaciones.find(fila => fila.examenId === intento.id);
    return {
      simulacroId, definitiva: proyeccion.definitiva,
      puntaje: nota ? nota.puntajeCentesimos / 100 : null,
      general: resumen({}),
      carrera: intento.carrera ? resumen({ carrera: intento.carrera }) : null,
      sede: intento.sedeId ? resumen({ sedeId: intento.sedeId }) : null,
    };
  }

  async administrativo(actor: ActorRanking, simulacroId: string, solicitado: AmbitoRanking) {
    const ambito = limitarAmbito(actor, solicitado);
    const proyeccion = await this.consultar(simulacroId);
    if (!proyeccion) throw new ErrorConsultaRanking(404, 'Ranking no disponible.');
    const filas = seleccionarFilas(proyeccion, ambito).map(fila => ({
      postulanteId: fila.postulanteId, puesto: fila.puesto, puntaje: fila.puntajeCentesimos / 100,
    }));
    return { simulacroId, ambito, definitiva: proyeccion.definitiva, participantes: filas.length, filas };
  }
}
