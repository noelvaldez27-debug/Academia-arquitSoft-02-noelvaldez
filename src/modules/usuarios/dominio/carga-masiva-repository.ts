import { CargaMasiva, FilaCargaMasiva } from './carga-masiva';

export interface CargaMasivaRepository {
  guardar(carga: CargaMasiva): Promise<void>;
  buscarPorId(id: string): Promise<CargaMasiva | null>;
  actualizar(carga: CargaMasiva): Promise<void>;
  guardarFilas(filas: FilaCargaMasiva[]): Promise<void>;
  obtenerFilasPorLote(cargaId: string, lote: number): Promise<FilaCargaMasiva[]>;
  contarLotes(cargaId: string): Promise<number>;
  marcarFilaProcesada(filaId: number, estado: 'PROCESADA' | 'ERROR'): Promise<void>;
}
