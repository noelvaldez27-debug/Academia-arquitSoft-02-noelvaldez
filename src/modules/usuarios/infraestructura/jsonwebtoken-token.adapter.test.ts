import { JsonWebTokenAdapter } from './jsonwebtoken-token.adapter';
import { RolUsuario } from '../dominio';

describe('JsonWebTokenAdapter (ADR-007, ADR-008, CA-U05)', () => {
  const secretSeguro = 'clave_secreta_super_segura_para_pruebas_123456';

  it('debe generar y verificar un token JWT exitosamente', async () => {
    const adapter = new JsonWebTokenAdapter({
      secret: secretSeguro,
      duracion: '1h',
      nodeEnv: 'development',
    });

    const token = await adapter.generarToken({
      id: 'usuario-123',
      rol: RolUsuario.Postulante,
      sedeId: 'sede-hana',
    });

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = await adapter.verificarToken(token);
    expect(payload.id).toBe('usuario-123');
    expect(payload.rol).toBe(RolUsuario.Postulante);
    expect(payload.sedeId).toBe('sede-hana');
  });

  it('debe fallar al inicializar si falta JWT_SECRET', () => {
    expect(() => {
      new JsonWebTokenAdapter({ secret: '', nodeEnv: 'development' });
    }).toThrow('Falta la variable de entorno JWT_SECRET requerida para la autenticacion.');
  });

  it('debe fallar al inicializar si NODE_ENV es production y JWT_SECRET empieza por cambiar_', () => {
    expect(() => {
      new JsonWebTokenAdapter({
        secret: 'cambiar_esta_clave_insegura',
        nodeEnv: 'production',
      });
    }).toThrow('JWT_SECRET no seguro para produccion: no se permite una clave que empiece por cambiar_ en NODE_ENV=production.');
  });

  it('debe permitir clave de desarrollo que empiece por cambiar_ si NODE_ENV es development', () => {
    expect(() => {
      new JsonWebTokenAdapter({
        secret: 'cambiar_esta_clave_en_desarrollo',
        nodeEnv: 'development',
      });
    }).not.toThrow();
  });

  it('debe rechazar un token alterado o mal formado', async () => {
    const adapter = new JsonWebTokenAdapter({
      secret: secretSeguro,
      duracion: '1h',
      nodeEnv: 'development',
    });

    await expect(adapter.verificarToken('token_totalmente_invalido')).rejects.toThrow(
      'Token JWT invalido o expirado.'
    );
  });
});
