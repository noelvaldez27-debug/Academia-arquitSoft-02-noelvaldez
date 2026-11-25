export interface Conteos {
  correctas: number;
  incorrectas: number;
  omitidas: number;
}

export interface ConteosCurso extends Conteos {
  cursoId: string;
}

export interface ResultadoAcademico extends Conteos {
  examenId: string;
  postulanteId: string;
  simulacroId: string;
  puntajeCentesimos: number;
  porCurso: ConteosCurso[];
}

export interface IntentoCerrado {
  id: string;
  postulanteId: string;
  simulacroId: string;
  cierre: Date;
  sedeId: string | null;
}

export function totalEvaluado({ correctas, incorrectas, omitidas }: Conteos): number {
  return correctas + incorrectas + omitidas;
}

export function porcentaje(cantidad: number, total: number): number {
  if (total === 0) return 0;
  const denominador = BigInt(total);
  return Number((BigInt(cantidad) * 20_000n + denominador) / (2n * denominador)) / 100;
}

export function acumular(destino: Conteos, valor: Conteos): void {
  destino.correctas += valor.correctas;
  destino.incorrectas += valor.incorrectas;
  destino.omitidas += valor.omitidas;
}
