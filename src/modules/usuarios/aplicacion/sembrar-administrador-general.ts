import { Usuario, UsuarioRepository } from '../dominio';
import { ServicioHash } from './servicio-hash.port';

export interface ParametrosSembradoAdmin {
  nombre?: string;
  correo?: string;
  password?: string;
}

export interface ResultadoSembradoAdmin {
  creado: boolean;
  mensaje: string;
  usuario?: Usuario;
}

/**
 * Servicio de aplicación para sembrar el primer y único Administrador General (CA-U04, RF25).
 * Los datos se toman de variables de entorno sin valor de respaldo.
 * Si ya existe un Administrador General, no se crea otro ni se modifica el existente.
 */
export class SembradorAdministradorGeneral {
  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly servicioHash: ServicioHash
  ) {}

  public async sembrar(params: ParametrosSembradoAdmin): Promise<ResultadoSembradoAdmin> {
    if (!params.nombre || params.nombre.trim() === '') {
      throw new Error('Falta la variable de entorno ADMIN_GENERAL_NOMBRE requerida para el administrador general inicial.');
    }
    if (!params.correo || params.correo.trim() === '') {
      throw new Error('Falta la variable de entorno ADMIN_GENERAL_CORREO requerida para el administrador general inicial.');
    }
    if (!params.password || params.password.trim() === '') {
      throw new Error('Falta la variable de entorno ADMIN_GENERAL_PASSWORD requerida para el administrador general inicial.');
    }

    const existe = await this.usuarioRepository.existeAdministradorGeneral();
    if (existe) {
      return {
        creado: false,
        mensaje: 'Ya existe un administrador general en el sistema. No se realizaron cambios.',
      };
    }

    const passwordHash = await this.servicioHash.generarHash(params.password.trim());
    const admin = Usuario.crearAdministradorGeneral({
      nombre: params.nombre.trim(),
      correo: params.correo.trim().toLowerCase(),
      passwordHash,
    });

    const guardado = await this.usuarioRepository.guardar(admin);
    return {
      creado: true,
      mensaje: `Administrador general inicial (${guardado.correo}) creado exitosamente.`,
      usuario: guardado,
    };
  }
}
