export interface ParticipanteRanking {
  postulanteId: string;
  carrera: string | null;
  sedeId: string | null;
  puntajeCentesimos: number;
}

export interface AmbitoRanking {
  carrera?: string;
  sedeId?: string;
}

export function clasificar<T extends ParticipanteRanking>(
  participantes: readonly T[],
  ambito: AmbitoRanking = {},
): (T & { puesto: number })[] {
  const ordenados = participantes
    .filter(participante => (ambito.carrera === undefined || participante.carrera === ambito.carrera)
      && (ambito.sedeId === undefined || participante.sedeId === ambito.sedeId))
    .sort((a, b) => b.puntajeCentesimos - a.puntajeCentesimos
      || (a.postulanteId < b.postulanteId ? -1 : Number(a.postulanteId > b.postulanteId)));

  let puesto = 0;
  return ordenados.map((participante, indice) => {
    if (participante.puntajeCentesimos !== ordenados[indice - 1]?.puntajeCentesimos) {
      puesto = indice + 1;
    }
    return { ...participante, puesto };
  });
}
