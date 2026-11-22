export interface PropiedadesSede {
  id?: string;
  nombre: string;
}

export class Sede {
  private readonly _id?: string;
  private readonly _nombre: string;

  constructor(props: PropiedadesSede) {
    if (!props.nombre || props.nombre.trim() === '') {
      throw new Error('El nombre de la sede es obligatorio y no puede estar vacio.');
    }
    this._id = props.id;
    this._nombre = props.nombre.trim();
  }

  get id(): string | undefined {
    return this._id;
  }

  get nombre(): string {
    return this._nombre;
  }
}
