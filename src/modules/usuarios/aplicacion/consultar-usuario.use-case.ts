import { UsuarioRepository } from '../dominio';
import { ServicioConsultaUsuarios, UsuarioPublicoDTO } from './consultar-usuario.port';

/**
 * Caso de uso: Consultar usuario por identificador para otros módulos (CA-U07).
 * Implementa el puerto ServicioConsultaUsuarios.
 * Retorna datos incluyendo sede y carrera, sin contraseñas ni hashes (AC04).
 */
export class ConsultarUsuarioUseCase implements ServicioConsultaUsuarios {
  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  public async consultarPorId(id: string): Promise<UsuarioPublicoDTO | null> {
    if (!id || id.trim() === '') {
      return null;
    }

    const usuario = await this.usuarioRepository.buscarPorId(id.trim());
    if (!usuario) {
      return null;
    }

    return {
      id: usuario.id ?? id.trim(),
      nombre: usuario.nombre,
      dni: usuario.dni ?? null,
      correo: usuario.correo,
      rol: usuario.rol,
      activo: usuario.activo,
      sedeId: usuario.sedeId ?? null,
      carrera: usuario.carrera ?? null,
      alcanceAdministrador: usuario.alcanceAdministrador ?? null,
    };
  }
}
