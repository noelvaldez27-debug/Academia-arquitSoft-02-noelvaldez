export type Alternativa = 'A' | 'B' | 'C' | 'D' | 'E';
export interface ClavePregunta {
  preguntaId: string;
  cursoId: string;
  correcta: Alternativa;
}
export interface ExamenParaCalificar {
  examenId: string;
  postulanteId: string;
  simulacroId: string;
  respuestas: { numero: number; alternativa: Alternativa | null }[];
}
type Correccion = 'correctas' | 'incorrectas' | 'omitidas';
export interface Conteos {
  correctas: number;
  incorrectas: number;
  omitidas: number;
}
export interface Resultado extends Conteos {
  examenId: string;
  postulanteId: string;
  simulacroId: string;
  puntajeCentesimos: number;
  porCurso: (Conteos & { cursoId: string })[];
  detalle: { preguntaId: string; cursoId: string; correccion: Correccion }[];
}

export class ErrorIntegridadResultado extends Error {}

function conteos(): Conteos {
  return { correctas: 0, incorrectas: 0, omitidas: 0 };
}

export function calificar(examen: ExamenParaCalificar, claves: ClavePregunta[]): Resultado {
  const total = claves.length;
  if (total === 0 || new Set(claves.map(pregunta => pregunta.preguntaId)).size !== total ||
      claves.some(pregunta => !pregunta.preguntaId || !pregunta.cursoId || !/^[A-E]$/.test(pregunta.correcta))) {
    throw new ErrorIntegridadResultado('La versión congelada no tiene claves válidas.');
  }
  const marcas = new Map<number, Alternativa | null>();
  for (const { numero, alternativa } of examen.respuestas) {
    if (!Number.isInteger(numero) || numero < 1 || numero > total || marcas.has(numero) ||
        (alternativa !== null && !/^[A-E]$/.test(alternativa))) {
      throw new ErrorIntegridadResultado('Las respuestas definitivas no corresponden a la versión congelada.');
    }
    marcas.set(numero, alternativa);
  }

  const generales = conteos();
  const cursos = new Map<string, Conteos>();
  const detalle = claves.map(({ preguntaId, cursoId, correcta }, indice) => {
    const marca = marcas.get(indice + 1);
    const correccion: Correccion = marca == null ? 'omitidas' : marca === correcta ? 'correctas' : 'incorrectas';
    const curso = cursos.get(cursoId) ?? conteos();
    curso[correccion]++;
    cursos.set(cursoId, curso);
    generales[correccion]++;
    return { preguntaId, cursoId, correccion };
  });
  const cantidad = BigInt(total);
  const numerador = BigInt(generales.correctas) * 100_000n;
  const puntajeCentesimos = Number((2n * numerador + cantidad) / (2n * cantidad));
  const { examenId, postulanteId, simulacroId } = examen;
  return {
    examenId, postulanteId, simulacroId, puntajeCentesimos, ...generales, detalle,
    porCurso: Array.from(cursos, ([cursoId, conteo]) => ({ cursoId, ...conteo })),
  };
}
