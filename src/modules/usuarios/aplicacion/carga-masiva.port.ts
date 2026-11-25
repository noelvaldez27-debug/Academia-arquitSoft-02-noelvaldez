import { CargaMasiva, CargaMasivaRepository, UsuarioRepository } from '../dominio';
import { RegistrarEstudianteUseCase } from './registrar-estudiante.use-case';

export interface LoteCargaMasiva {
  cargaId: string;
  numeroLote: number;
}

export interface TransaccionCargaMasiva {
  cargas: CargaMasivaRepository;
  usuarios: UsuarioRepository;
  registro: RegistrarEstudianteUseCase;
  bloquearCarga(id: string): Promise<CargaMasiva | null>;
  guardarEnvios(id: string, lotes: number): Promise<void>;

}

export interface PersistenciaCargaMasiva {
  transaccion<T>(operacion: (contexto: TransaccionCargaMasiva) => Promise<T>): Promise<T>;
}
