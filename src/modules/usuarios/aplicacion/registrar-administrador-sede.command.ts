import { RolUsuario, AlcanceAdministrador } from '../dominio';

export interface RegistrarAdministradorSedeCommand {
  nombre: string;
  correo: string;
  passwordInicial: string;
  sedeId: string;
  ejecutor?: {
    id: string;
    rol: RolUsuario;
    sedeId?: string | null;
    alcanceAdministrador?: AlcanceAdministrador | null;
  };
}
