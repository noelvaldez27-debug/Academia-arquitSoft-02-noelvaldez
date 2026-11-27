import type { CondicionPostulante } from './usuario';
export type EstadoCargaMasiva = 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADA' | 'FALLIDA';

export interface DetalleErrorFila {
  fila: number;
  motivo: string;
}

export interface FilaCargaMasiva {
  id?: number;
  cargaId: string;
  numeroLote: number;
  numeroFila: number;
  nombre: string;
  dni: string;
  sedeId: number;
  carrera: string;
  condicion?: CondicionPostulante | null;
  estado?: 'PENDIENTE' | 'PROCESADA' | 'ERROR';
}

export interface CargaMasivaProps {
  id: string;
  usuarioId: number;
  sedeId: number | null;
  cicloId?: string | null;
  cicloNombre?: string | null;
  importacionAutomatica?: boolean;
  estado?: EstadoCargaMasiva;
  totalFilas?: number;
  creadas?: number;
  recuperadas?: number;
  vinculadas?: number;
  yaExistian?: number;
  rechazadas?: number;
  errores?: DetalleErrorFila[];
  avisos?: DetalleErrorFila[];
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class CargaMasiva {
  readonly cicloId: string | null;
  private readonly _cicloNombre: string | null;
  readonly importacionAutomatica: boolean;
  private readonly _id: string;
  private readonly _usuarioId: number;
  private readonly _sedeId: number | null;
  private _estado: EstadoCargaMasiva;
  private _totalFilas: number;
  private _creadas: number;
  private _recuperadas: number;
  private _vinculadas: number;
  private _yaExistian: number;
  private _rechazadas: number;
  private _errores: DetalleErrorFila[];
  private _avisos: DetalleErrorFila[];
  private readonly _creadoEn: Date;
  private _actualizadoEn: Date;

  constructor(props: CargaMasivaProps) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('El identificador de la carga masiva es obligatorio');
    }
    if (!props.usuarioId || props.usuarioId <= 0) {
      throw new Error('El identificador del usuario que sube la carga es obligatorio y positivo');
    }

    this._id = props.id;
    this._usuarioId = props.usuarioId;
    this._sedeId = props.sedeId ?? null;
    this.cicloId = props.cicloId ?? null;
    this._cicloNombre = props.cicloNombre ?? null;
    this.importacionAutomatica = props.importacionAutomatica ?? false;
    this._estado = props.estado ?? 'PENDIENTE';
    this._totalFilas = props.totalFilas ?? 0;
    this._creadas = props.creadas ?? 0;
    this._recuperadas = props.recuperadas ?? 0;
    this._vinculadas = props.vinculadas ?? 0;
    this._yaExistian = props.yaExistian ?? 0;
    this._rechazadas = props.rechazadas ?? 0;
    this._errores = props.errores ? [...props.errores] : [];
    this._avisos = props.avisos ? [...props.avisos] : [];
    this._creadoEn = props.creadoEn ?? new Date();
    this._actualizadoEn = props.actualizadoEn ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  get usuarioId(): number {
    return this._usuarioId;
  }

  get sedeId(): number | null {
    return this._sedeId;
  }

  get cicloNombre(): string | null { return this._cicloNombre; }

  get estado(): EstadoCargaMasiva {
    return this._estado;
  }

  get totalFilas(): number {
    return this._totalFilas;
  }

  get creadas(): number {
    return this._creadas;
  }
  get recuperadas(): number {
    return this._recuperadas;
  }

  get vinculadas(): number {
    return this._vinculadas;
  }

  get yaExistian(): number {
    return this._yaExistian;
  }

  get rechazadas(): number {
    return this._rechazadas;
  }

  get errores(): ReadonlyArray<DetalleErrorFila> {
    return [...this._errores];
  }

  get avisos(): ReadonlyArray<DetalleErrorFila> {
    return [...this._avisos];
  }

  get creadoEn(): Date {
    return this._creadoEn;
  }

  get actualizadoEn(): Date {
    return this._actualizadoEn;
  }

  public marcarComoProcesando(): void {
    this._estado = 'PROCESANDO';
    this._actualizadoEn = new Date();
  }

  public marcarComoCompletada(): void {
    this._estado = 'COMPLETADA';
    this._actualizadoEn = new Date();
  }

  public marcarComoFallida(): void {
    this._estado = 'FALLIDA';
    this._actualizadoEn = new Date();
  }

  public incrementarCreadas(cantidad: number = 1): void {
    this._creadas += cantidad;
    this._actualizadoEn = new Date();
  }
  public incrementarRecuperadas(): void {
    this._recuperadas++;
    this._actualizadoEn = new Date();
  }

  public incrementarVinculadas(): void {
    this._vinculadas++;
    this._actualizadoEn = new Date();
  }

  public incrementarYaExistian(cantidad: number = 1): void {
    this._yaExistian += cantidad;
    this._actualizadoEn = new Date();
  }

  public agregarRechazo(fila: number, motivo: string): void {
    this._rechazadas += 1;
    this._errores.push({ fila, motivo });
    this._actualizadoEn = new Date();
  }

  public agregarAviso(fila: number, motivo: string): void {
    this._avisos.push({ fila, motivo });
    this._actualizadoEn = new Date();
  }
}
