import { ClavePregunta, ExamenParaCalificar } from './resultado';

export interface ExamenesFinalizadosPort {
  consultar(id: string): Promise<ExamenParaCalificar | null>;
}

export interface ClaveRespuestasPort {
  clave(id: string): Promise<ClavePregunta[] | null>;
}
