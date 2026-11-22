import { RolUsuario } from '../dominio';

export interface PayloadToken {
  id: string;
  rol: RolUsuario;
  sedeId: string | null;
}

export interface ServicioToken {
  generarToken(payload: PayloadToken): Promise<string>;
  verificarToken(token: string): Promise<PayloadToken>;
}
