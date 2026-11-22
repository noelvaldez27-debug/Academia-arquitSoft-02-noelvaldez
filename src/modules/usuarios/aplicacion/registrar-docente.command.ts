import { EjecutorAccion } from './registrar-estudiante.command';

export interface RegistrarDocenteCommand {
  nombre: string;
  dni: string;
  ejecutor?: EjecutorAccion;
}
