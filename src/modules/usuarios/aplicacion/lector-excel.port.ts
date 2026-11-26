import type { CondicionPostulante } from '../dominio/usuario';

export interface FilaExcelValidada {
  numeroFila: number;
  nombre: string;
  dni: string;
  sede: string;
  carrera: string;
  condicion?: CondicionPostulante;
}

export interface ResultadoLecturaExcel {
  filasValidas: FilaExcelValidada[];
  filaRechazadas: Array<{ fila: number; motivo: string }>;
}

export interface OpcionesLecturaExcel {
  exigirColumnaSede?: boolean;
  exigirCondicion?: boolean;
  maxMb?: number;
  maxFilas?: number;
  sedeAdminNombre?: string | null;
}

export type LectorExcel = (archivo: Buffer | ArrayBuffer, opciones?: OpcionesLecturaExcel) => Promise<ResultadoLecturaExcel>;
