import { ErrorBancoPreguntas } from './errores';

export const CLAVES_ALTERNATIVAS = ['A', 'B', 'C', 'D', 'E'] as const;
export type ClaveAlternativa = typeof CLAVES_ALTERNATIVAS[number];

export interface ContenidoPregunta {
  enunciado: string;
  alternativas: Record<ClaveAlternativa, string>;
  correcta: ClaveAlternativa;
}

export function validarContenidoPregunta(contenido: ContenidoPregunta): ContenidoPregunta {
  const enunciado = typeof contenido?.enunciado === 'string' ? contenido.enunciado.trim() : '';
  const claves = Object.keys(contenido?.alternativas ?? {});
  if (!enunciado || claves.length !== CLAVES_ALTERNATIVAS.length ||
      !CLAVES_ALTERNATIVAS.every(clave => typeof contenido.alternativas[clave] === 'string' &&
        contenido.alternativas[clave].trim()) || !CLAVES_ALTERNATIVAS.includes(contenido.correcta)) {
    throw new ErrorBancoPreguntas('validacion', 'Se requiere un enunciado, cinco alternativas A a E y una clave correcta.');
  }
  return {
    enunciado,
    alternativas: Object.fromEntries(CLAVES_ALTERNATIVAS.map(clave =>
      [clave, contenido.alternativas[clave].trim()])) as ContenidoPregunta['alternativas'],
    correcta: contenido.correcta,
  };
}

export interface Pregunta extends ContenidoPregunta {
  id: string;
  cursoId: string;
  habilitada: boolean;
  propuestaId: string | null;
}

export interface Curso {
  id: string;
  nombre: string;
}

export interface ConfiguracionSimulacro {
  id: string;
  duracionMinutos: number;
  preguntas: string[];
}
