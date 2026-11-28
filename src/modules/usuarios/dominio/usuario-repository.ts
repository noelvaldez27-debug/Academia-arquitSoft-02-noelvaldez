import { Usuario } from './usuario';
import { RolUsuario } from './rol-usuario';
import type { EmisionProvisional } from './emision-provisional';

export interface FiltrosListadoUsuarios {
  rol?: RolUsuario;
  sedeId?: string;
  pagina?: number;
  limite?: number;
  soloArchivados?: boolean;
  q?: string;
}

export interface ResultadoPaginadoUsuarios {
  usuarios: Usuario[];
  total: number;
  pagina: number;
  limite: number;
}

export interface UsuarioRepository {
  guardar(usuario: Usuario, emision?: EmisionProvisional): Promise<Usuario>;
  actualizar(usuario: Usuario): Promise<void>;
  cambiarPassword?(id: string, versionSesion: number, hash: string,
    evento?: 'CAMBIO_VOLUNTARIO' | 'CAMBIO_OBLIGATORIO'): Promise<boolean>;
  buscarPorId(id: string): Promise<Usuario | null>;
  buscarPorDni(dni: string): Promise<Usuario | null>;
  buscarPorCorreo(correo: string): Promise<Usuario | null>;
  existeAdministradorGeneral(): Promise<boolean>;
  listar(filtros?: FiltrosListadoUsuarios): Promise<ResultadoPaginadoUsuarios>;
}
