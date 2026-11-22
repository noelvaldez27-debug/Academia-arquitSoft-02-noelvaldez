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
  estado?: 'PENDIENTE' | 'PROCESADA' | 'ERROR';
}

export interface CargaMasivaProps {
  id: string;
  usuarioId: number;
  sedeId: number | null;
  estado?: EstadoCargaMasiva;
  totalFilas?: number;
  creadas?: number;
  yaExistian?: number;
  rechazadas?: number;
  errores?: DetalleErrorFila[];
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class CargaMasiva {
  private readonly _id: string;
  private readonly _usuarioId: number;
  private readonly _sedeId: number | null;
  private _estado: EstadoCargaMasiva;
  private _totalFilas: number;
  private _creadas: number;
  private _yaExistian: number;
  private _rechazadas: number;
  private _errores: DetalleErrorFila[];
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
    this._estado = props.estado ?? 'PENDIENTE';
    this._totalFilas = props.totalFilas ?? 0;
    this._creadas = props.creadas ?? 0;
    this._yaExistian = props.yaExistian ?? 0;
    this._rechazadas = props.rechazadas ?? 0;
    this._errores = props.errores ? [...props.errores] : [];
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

  get estado(): EstadoCargaMasiva {
    return this._estado;
  }

  get totalFilas(): number {
    return this._totalFilas;
  }

  get creadas(): number {
    return this._creadas;
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

  public incrementarYaExistian(cantidad: number = 1): void {
    this._yaExistian += cantidad;
    this._actualizadoEn = new Date();
  }

  public agregarRechazo(fila: number, motivo: string): void {
    this._rechazadas += 1;
    // Guardar los detalles de error con un tope razonable (1000 primeros) para evitar saturar memoria
    if (this._errores.length < 1000) {
      this._errores.push({ fila, motivo });
    }
    this._actualizadoEn = new Date();
  }
}
