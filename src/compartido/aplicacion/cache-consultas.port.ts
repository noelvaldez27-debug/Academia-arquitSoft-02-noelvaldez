export interface CacheConsultas {
  leer<T>(clave: string, validar: (valor: unknown) => valor is T): Promise<T | undefined>;
  guardar(clave: string, valor: unknown, segundos: number): Promise<void>;
  eliminar(clave: string): Promise<void>;
}
