import { resolverPasswordInicialDni } from './politica-password-inicial';
import { CredencialesProvisionales } from './credenciales-provisionales';

describe('política de contraseña inicial', () => {
  it('desactiva DNI por defecto y permite habilitarlo solo explícitamente en desarrollo/pruebas', () => {
    expect(resolverPasswordInicialDni(undefined, 'production')).toBe(false);
    expect(resolverPasswordInicialDni('true', 'test')).toBe(true);
    expect(resolverPasswordInicialDni(true, 'development')).toBe(true);
    expect(() => resolverPasswordInicialDni('true', 'production')).toThrow(/solo puede activarse/);
    expect(() => resolverPasswordInicialDni('si', 'test')).toThrow(/debe ser true o false/);
  });

  it('emite contraseña inicial sin cambio obligatorio y valida DNI sin completarlo', async () => {
    const generarHash = jest.fn(async (valor: string) => `hash:${valor}`);
    const credenciales = new CredencialesProvisionales('clave-sintetica', { generarHash, comparar: jest.fn() }, true);
    const emision = await credenciales.emitirInicial('admin-sintetico', '12345678');
    expect(emision.tipoPassword).toBe('DNI');
    expect(emision.requiereCambio).toBe(false);
    expect(emision.passwordHash).toBe('hash:12345678');
    await expect(credenciales.emitirInicial('admin-sintetico', '1234567')).rejects.toThrow(/ocho dígitos/);
    expect(generarHash).toHaveBeenCalledTimes(1);
  });

  it('emite contraseña inicial aleatoria por defecto sin obligar a cambiarla', async () => {
    const generarHash = jest.fn(async (valor: string) => `hash:${valor}`);
    const credenciales = new CredencialesProvisionales('clave-sintetica', { generarHash, comparar: jest.fn() });
    const emision = await credenciales.emitirInicial('admin-sintetico', '12345678');
    expect(emision.tipoPassword).toBe('ALEATORIA');
    expect(emision.requiereCambio).toBe(false);
    expect(emision.passwordHash).not.toBe('hash:12345678');
  });
});
