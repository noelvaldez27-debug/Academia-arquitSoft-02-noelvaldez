import { UsuariosModule } from './usuarios.module';
import * as ModuloUsuarios from './index';

describe('Módulo Gestión de Usuarios — Estructura', () => {
  it('debe instanciar UsuariosModule correctamente', () => {
    const modulo = new UsuariosModule();
    expect(modulo).toBeDefined();
    expect(() => modulo.inicializar()).not.toThrow();
  });

  it('debe exportar UsuariosModule en la API pública del módulo', () => {
    expect(ModuloUsuarios.UsuariosModule).toBeDefined();
  });
});
