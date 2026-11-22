export interface IniciarSesionCommand {
  correo: string;
  password: string;
}

export interface UsuarioAutenticadoDTO {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  sedeId?: string | null;
}

export interface ResultadoInicioSesion {
  token: string;
  usuario: UsuarioAutenticadoDTO;
}
