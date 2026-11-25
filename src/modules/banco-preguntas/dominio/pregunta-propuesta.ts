import { ErrorBancoPreguntas } from './errores';
import { ContenidoPregunta, validarContenidoPregunta } from './pregunta';

export interface PreguntaPropuesta extends ContenidoPregunta {
  id: string;
  separataId: string;
  estado: 'PROPUESTA' | 'APROBADA' | 'RECHAZADA';
}

export function corregirPropuesta(propuesta: PreguntaPropuesta, contenido: ContenidoPregunta): PreguntaPropuesta {
  if (propuesta.estado === 'RECHAZADA') {
    throw new ErrorBancoPreguntas('conflicto', 'La propuesta descartada no puede corregirse.');
  }
  return { ...propuesta, ...validarContenidoPregunta(contenido), estado: 'PROPUESTA' };
}

export function resolverPropuesta(
  propuesta: PreguntaPropuesta, estado: 'APROBADA' | 'RECHAZADA',
): PreguntaPropuesta {
  if (propuesta.estado !== 'PROPUESTA') {
    throw new ErrorBancoPreguntas('conflicto', 'La propuesta ya fue resuelta.');
  }
  return { ...propuesta, estado };
}
