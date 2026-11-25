export interface Tema {
  id: string;
  cursoId: string;
  nombre: string;
  activo: boolean;
}

export interface TemaRepository {
  listar(cursoId: string): Promise<Tema[]>;
  crear(tema: Tema): Promise<Tema>;
  actualizar(id: string, cambios: { nombre?: string; activo?: false }): Promise<Tema>;
}
