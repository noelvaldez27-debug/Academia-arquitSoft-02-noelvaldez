import { RolUsuario } from '../dominio';

export interface PayloadToken {
  id: string;
  rol: RolUsuario;
  sedeId: string | null;
  versionSesion?: number;
}

export interface ServicioToken {
  generarToken(payload: PayloadToken): Promise<string>;
  verificarToken(token: string): Promise<PayloadToken>;
}
