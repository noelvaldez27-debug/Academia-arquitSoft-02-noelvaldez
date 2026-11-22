import { Sede } from './sede';

export interface SedeRepository {
  guardar(sede: Sede): Promise<Sede>;
  buscarPorId(id: string): Promise<Sede | null>;
  buscarPorNombre(nombre: string): Promise<Sede | null>;
  listarTodas(): Promise<Sede[]>;
}
