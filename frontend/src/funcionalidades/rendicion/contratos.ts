export const examenes = '/api/v1/examenes';
export const alternativas = ['A', 'B', 'C', 'D', 'E'] as const;
export type Alternativa = typeof alternativas[number];
export interface Marca { numero: number; alternativa: Alternativa | null; revision: number }
export interface Intento {
  id: string; simulacroId: string; inicio: string; vence: string; cierre: string | null;
  estado: 'ACTIVO' | 'FINALIZADO'; tiempoRestanteMs: number;
  preguntas: { id: string; enunciado: string; alternativas: Record<Alternativa, string> }[];
  respuestas: Marca[];
}
export interface Opcion {
  simulacroId: string; intentoId: string | null; habilitadoEn: string | null;
  estado: 'DISPONIBLE' | 'EN_CURSO' | 'FINALIZADO';
}
export type Modo = 'virtual' | 'impreso';
export interface Reloj { intento: Intento; recibidoEn: number }

export function restante(origen: Reloj, ahora = performance.now()) {
  return Math.max(0, origen.intento.tiempoRestanteMs - Math.max(0, ahora - origen.recibidoEn));
}

export function formatoTiempo(ms: number) {
  const segundos = Math.ceil(ms / 1000);
  return [Math.floor(segundos / 60), segundos % 60].map(n => String(n).padStart(2, '0')).join(':');
}
