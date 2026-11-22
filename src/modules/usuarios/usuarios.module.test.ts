import { Pool } from 'pg';
import { UsuariosModule } from './usuarios.module';
import * as ModuloUsuarios from './index';

describe('Módulo Gestión de Usuarios — Raíz de composición', () => {
  let mockPool: Partial<Pool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
  });

  it('debe instanciar UsuariosModule con todas sus dependencias conectadas', () => {
    const modulo = new UsuariosModule({
      pool: mockPool as Pool,
      jwtSecret: 'clave_jwt_para_test_12345678',
      jwtDuracion: '2h',
    });

    expect(modulo).toBeDefined();
    expect(modulo.router).toBeDefined();
    expect(modulo.controller).toBeDefined();
    expect(modulo.middlewareAutenticacion).toBeDefined();
    expect(modulo.registrarEstudianteUseCase).toBeDefined();
    expect(modulo.registrarDocenteUseCase).toBeDefined();
    expect(modulo.iniciarSesionUseCase).toBeDefined();
  });

  it('debe exportar UsuariosModule y los componentes en la API pública del módulo', () => {
    expect(ModuloUsuarios.UsuariosModule).toBeDefined();
    expect(ModuloUsuarios.UsuarioController).toBeDefined();
    expect(ModuloUsuarios.crearRutasUsuario).toBeDefined();
    expect(ModuloUsuarios.MiddlewareAutenticacion).toBeDefined();
  });
});
