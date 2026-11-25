import { RolUsuario, AlcanceAdministrador } from '../dominio';

export interface EjecutorAccion {
  id: string;
  rol: RolUsuario;
  sedeId?: string | null;
  alcanceAdministrador?: AlcanceAdministrador | null;
}

export interface RegistrarEstudianteCommand {
  nombre: string;
  dni: string;
  sedeId: string;
  carrera: string;
  condicion?: unknown;
  ejecutor?: EjecutorAccion;
}
