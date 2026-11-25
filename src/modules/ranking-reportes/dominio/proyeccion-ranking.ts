import { clasificar, ParticipanteRanking } from './clasificacion';

export interface IntentoRanking {
  id: string;
  postulanteId: string;
  carrera: string | null;
  sedeId: string | null;
  condicion: 'MATRICULADO' | 'LIBRE' | null;
  inicio: string;
  cierre: string | null;
}

export interface CalificacionRanking {
  examenId: string;
  puntajeCentesimos: number;
  correctas: number;
  incorrectas: number;
  omitidas: number;
  porCurso: { cursoId: string; correctas: number; incorrectas: number; omitidas: number }[];
}

export interface FilaRanking extends ParticipanteRanking {
  examenId: string;
  puesto: number;
}

export interface ProyeccionRanking {
  definitiva: boolean;
  intentos: IntentoRanking[];
  calificaciones: CalificacionRanking[];
  ambitos: { carrera: string | null; sedeId: string | null; filas: FilaRanking[] }[];
}

export function proyectarRanking(
  intentos: IntentoRanking[], resultados: CalificacionRanking[], cerrado: boolean,
): ProyeccionRanking {
  const cerrados = new Map(intentos.filter(intento => intento.cierre !== null).map(intento => [intento.id, intento]));
  const calificaciones = resultados.filter(resultado => cerrados.has(resultado.examenId));
  const grupos = new Map<string, ProyeccionRanking['ambitos'][number]>();
  const general = { carrera: null, sedeId: null, filas: [] as FilaRanking[] };
  grupos.set(JSON.stringify([null, null]), general);

  function agregar(carrera: string | null, sedeId: string | null, fila: FilaRanking) {
    const clave = JSON.stringify([carrera, sedeId]);
    const grupo = grupos.get(clave) ?? { carrera, sedeId, filas: [] };
    grupo.filas.push(fila);
    grupos.set(clave, grupo);
  }

  for (const calificacion of calificaciones) {
    const intento = cerrados.get(calificacion.examenId)!;
    const { postulanteId, carrera, sedeId } = intento;
    const fila = { examenId: intento.id, postulanteId, carrera, sedeId,
      puntajeCentesimos: calificacion.puntajeCentesimos, puesto: 0 };
    general.filas.push(fila);
    if (carrera !== null) agregar(carrera, null, fila);
    if (sedeId !== null) agregar(null, sedeId, fila);
    if (carrera !== null && sedeId !== null) agregar(carrera, sedeId, fila);
  }

  for (const grupo of grupos.values()) grupo.filas = clasificar(grupo.filas);
  return { definitiva: cerrado && calificaciones.length === intentos.length,
    intentos, calificaciones, ambitos: [...grupos.values()] };
}
