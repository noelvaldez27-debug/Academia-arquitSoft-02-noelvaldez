import { RolUsuario, AlcanceAdministrador } from '../dominio';

/**
 * DTO público de usuario para interacción con otros módulos (CA-U07).
 * Expone identificador, nombre, DNI, correo, rol, sede y carrera.
 * NUNCA incluye contraseñas ni hashes (AC04).
 */
export interface UsuarioPublicoDTO {
  id: string;
  nombre: string;
  dni?: string | null;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  sedeId?: string | null;
  carrera?: string | null;
  alcanceAdministrador?: AlcanceAdministrador | null;
}

/**
 * Puerto para consulta de usuarios desde otros módulos (CA-U07).
 * Los módulos Banco de Preguntas, Rendición de Examen, Procesamiento de Resultados,
 * Ranking y Analítica consultan usuarios solo a través de este contrato.
 */
export interface ServicioConsultaUsuarios {
  consultarPorId(id: string): Promise<UsuarioPublicoDTO | null>;
}
