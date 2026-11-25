interface EstadoRendicion {
  id: string;
  intentos: number;
  finalizados: number;
  cerrado: boolean;
}

interface EstadoProyeccion {
  id: string;
  intentos: number;
  finalizados: number;
  calificaciones: number;
  definitiva: boolean;
}

export function detectarCambiosRanking(
  fuentes: EstadoRendicion[], resultados: { id: string; total: number }[], proyecciones: EstadoProyeccion[],
): string[] {
  const totales = new Map(resultados.map(({ id, total }) => [id, total]));
  const actuales = new Map(proyecciones.map(estado => [estado.id, estado]));
  return fuentes.filter(({ id, intentos, finalizados, cerrado }) => {
    const actual = actuales.get(id);
    return !actual || actual.intentos !== intentos || actual.finalizados !== finalizados ||
      actual.calificaciones !== (totales.get(id) ?? 0) || actual.definitiva !== cerrado;
  }).map(({ id }) => id);
}
