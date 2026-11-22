/**
 * Raíz de composición del módulo Gestión de Usuarios.
 * Conecta casos de uso, repositorios y adaptadores mediante inyección de dependencias.
 */
export interface ConfigModuloUsuarios {
  // Configuración extensible para inyección de dependencias
}

export class UsuariosModule {
  constructor(private readonly config?: ConfigModuloUsuarios) {}

  public inicializar(): void {
    // Punto de inicialización del módulo
  }
}
