import { RolUsuario, AlcanceAdministrador } from './rol-usuario';

export const LONGITUD_MINIMA_PASSWORD = 8;

export type CondicionPostulante = 'MATRICULADO' | 'LIBRE';

export function esCondicionPostulante(valor: unknown): valor is CondicionPostulante {
  return valor === 'MATRICULADO' || valor === 'LIBRE';
}

export interface PropiedadesUsuario {
  id?: string;
  nombre: string;
  dni?: string | null;
  correo: string;
  passwordHash: string;
  rol: RolUsuario;
  activo?: boolean;
  versionSesion?: number;
  sedeId?: string | null;
  carrera?: string | null;
  condicion?: CondicionPostulante | null;
  alcanceAdministrador?: AlcanceAdministrador | null;
}

export class Usuario {
  readonly condicion: PropiedadesUsuario['condicion'];
  readonly versionSesion: number;
  private readonly _id?: string;
  private _nombre: string;
  private readonly _dni?: string | null;
  private _correo: string;
  private _passwordHash: string;
  private readonly _rol: RolUsuario;
  private _activo: boolean;
  private _sedeId?: string | null;
  private _carrera?: string | null;
  private readonly _alcanceAdministrador?: AlcanceAdministrador | null;

  constructor(props: PropiedadesUsuario) {
    if (!props.nombre || props.nombre.trim() === '') {
      throw new Error('El nombre del usuario es obligatorio.');
    }
    if (!props.correo || props.correo.trim() === '') {
      throw new Error('El correo del usuario es obligatorio.');
    }
    if (!props.passwordHash || props.passwordHash.trim() === '') {
      throw new Error('El hash de contraseña es obligatorio.');
    }

    this._id = props.id;
    this._nombre = props.nombre.trim();
    this._correo = props.correo.trim().toLowerCase();
    this._passwordHash = props.passwordHash;
    this._rol = props.rol;
    this.condicion = props.rol === RolUsuario.Postulante ? props.condicion ?? null : null;
    this._activo = props.activo !== undefined ? props.activo : true;
    this.versionSesion = props.versionSesion ?? 0;

    if (this._rol === RolUsuario.Postulante) {
      this.validarDni(props.dni);
      if (!props.sedeId || props.sedeId.trim() === '') {
        throw new Error('La sede es obligatoria para los postulantes.');
      }
      if (!props.carrera || props.carrera.trim() === '') {
        throw new Error('La carrera es obligatoria para los postulantes.');
      }
      this._dni = props.dni!.trim();
      this._sedeId = props.sedeId.trim();
      this._carrera = Usuario.normalizarCarrera(props.carrera);
      this._alcanceAdministrador = null;
    } else if (this._rol === RolUsuario.Docente) {
      this.validarDni(props.dni);
      if (props.sedeId) {
        throw new Error('Los docentes no pertenecen a una sede.');
      }
      this._dni = props.dni!.trim();
      this._sedeId = null;
      this._carrera = null;
      this._alcanceAdministrador = null;
    } else if (this._rol === RolUsuario.Administrador) {
      if (!props.alcanceAdministrador) {
        throw new Error('El alcance del administrador (general o sede) es obligatorio.');
      }
      this._alcanceAdministrador = props.alcanceAdministrador;
      this._dni = props.dni ? props.dni.trim() : null;
      this._carrera = null;

      if (this._alcanceAdministrador === AlcanceAdministrador.General) {
        if (props.sedeId) {
          throw new Error('El administrador general no pertenece a una sede.');
        }
        this._sedeId = null;
      } else if (this._alcanceAdministrador === AlcanceAdministrador.Sede) {
        if (!props.sedeId || props.sedeId.trim() === '') {
          throw new Error('La sede es obligatoria para administradores de sede.');
        }
        this._sedeId = props.sedeId.trim();
      }
    } else {
      throw new Error(`Rol de usuario no reconocido: ${props.rol}`);
    }
  }

  private validarDni(dni?: string | null): void {
    if (!dni || !/^\d{8}$/.test(dni.trim())) {
      throw new Error('El DNI debe tener exactamente 8 digitos numericos.');
    }
  }

  public static normalizarCarrera(carrera: string): string {
    return carrera.trim().replace(/\s+/g, ' ').toUpperCase();
  }

  public static crearPostulante(params: {
    id?: string;
    nombre: string;
    dni: string;
    correo: string;
    passwordHash: string;
    sedeId: string;
    carrera: string;
    condicion?: CondicionPostulante | null;
    activo?: boolean;
  }): Usuario {
    return new Usuario({
      ...params,
      rol: RolUsuario.Postulante,
    });
  }

  public static crearDocente(params: {
    id?: string;
    nombre: string;
    dni: string;
    correo: string;
    passwordHash: string;
    activo?: boolean;
  }): Usuario {
    return new Usuario({
      ...params,
      rol: RolUsuario.Docente,
    });
  }

  public static crearAdministradorGeneral(params: {
    id?: string;
    nombre: string;
    correo: string;
    passwordHash: string;
    activo?: boolean;
  }): Usuario {
    return new Usuario({
      ...params,
      rol: RolUsuario.Administrador,
      alcanceAdministrador: AlcanceAdministrador.General,
    });
  }

  public static crearAdministradorSede(params: {
    id?: string;
    nombre: string;
    correo: string;
    passwordHash: string;
    sedeId: string;
    activo?: boolean;
  }): Usuario {
    return new Usuario({
      ...params,
      rol: RolUsuario.Administrador,
      alcanceAdministrador: AlcanceAdministrador.Sede,
      sedeId: params.sedeId,
    });
  }

  get id(): string | undefined {
    return this._id;
  }

  get nombre(): string {
    return this._nombre;
  }

  get dni(): string | null | undefined {
    return this._dni;
  }

  get correo(): string {
    return this._correo;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get rol(): RolUsuario {
    return this._rol;
  }

  get activo(): boolean {
    return this._activo;
  }

  get sedeId(): string | null | undefined {
    return this._sedeId;
  }

  get carrera(): string | null | undefined {
    return this._carrera;
  }

  get alcanceAdministrador(): AlcanceAdministrador | null | undefined {
    return this._alcanceAdministrador;
  }

  public desactivar(): void {
    this._activo = false;
  }

  public reactivar(): void {
    this._activo = true;
  }

  public cambiarPasswordHash(nuevoHash: string): void {
    if (!nuevoHash || nuevoHash.trim() === '') {
      throw new Error('El nuevo hash de contrasena no puede estar vacio.');
    }
    this._passwordHash = nuevoHash;
  }

  public cambiarCorreo(nuevoCorreo: string): void {
    if (this._rol !== RolUsuario.Administrador) {
      throw new Error('Solo los administradores pueden cambiar su correo.');
    }
    if (!nuevoCorreo || nuevoCorreo.trim() === '') {
      throw new Error('El nuevo correo no puede estar vacio.');
    }
    this._correo = nuevoCorreo.trim().toLowerCase();
  }
}
