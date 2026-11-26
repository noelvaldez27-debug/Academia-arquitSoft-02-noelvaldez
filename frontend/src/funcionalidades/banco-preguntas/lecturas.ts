import { useEffect, useState } from 'react';
import { usarSesion } from '../../app/sesion';

export const banco = '/api/banco-preguntas';
export interface Pagina<T> { datos: T[]; pagina: number; hayMas: boolean }
export interface Curso { id: string; nombre: string }
export interface Tema extends Curso { cursoId: string }
export const letras = ['A', 'B', 'C', 'D', 'E'] as const;
export interface Contenido {
  enunciado: string;
  alternativas: Record<typeof letras[number], string>;
  correcta: typeof letras[number];
  temaId?: string | null;
}
export interface Pregunta extends Contenido {
  id: string; cursoId: string; propuestaId: string | null; habilitada: boolean;
}

export function textoFallo(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

export function usarLectura<T>(ruta?: string, revision = 0) {
  const { solicitar } = usarSesion();
  const [lectura, guardar] = useState<{ ruta: string; datos?: T; error?: string }>();
  useEffect(() => {
    if (!ruta) return;
    const control = new AbortController();
    guardar(undefined);
    void solicitar<T>(ruta, { signal: control.signal }).then(datos => {
      if (!control.signal.aborted) guardar({ ruta, datos });
    }).catch(error => {
      if (!control.signal.aborted) guardar({ ruta, error: textoFallo(error) });
    });
    return () => control.abort();
  }, [solicitar, ruta, revision]);
  return ruta && lectura?.ruta === ruta ? lectura : undefined;
}
