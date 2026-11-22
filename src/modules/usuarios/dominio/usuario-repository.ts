import { Usuario } from './usuario';
import { RolUsuario } from './rol-usuario';

export interface FiltrosListadoUsuarios {
  rol?: RolUsuario;
  sedeId?: string;
}

export interface UsuarioRepository {
  guardar(usuario: Usuario): Promise<Usuario>;
  actualizar(usuario: Usuario): Promise<void>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorDni(dni: string): Promise<Usuario | null>;
  buscarPorCorreo(correo: string): Promise<Usuario | null>;
  existeAdministradorGeneral(): Promise<boolean>;
  listar(filtros?: FiltrosListadoUsuarios): Promise<Usuario[]>;
}
