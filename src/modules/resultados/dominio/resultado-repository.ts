import { Resultado } from './resultado';

export interface ResultadoRepository {
  existePorExamen(id: string): Promise<boolean>;
  guardarSiNoExiste(resultado: Resultado): Promise<void>;
}
