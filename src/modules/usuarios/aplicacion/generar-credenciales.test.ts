import { GeneradorCredenciales } from './generar-credenciales';
import { ServicioHash } from './servicio-hash.port';

describe('GeneradorCredenciales (CA-U02, RF02, RF19)', () => {
  let mockServicioHash: ServicioHash;

  beforeEach(() => {
    mockServicioHash = {
      generarHash: jest.fn().mockImplementation(async (texto: string) => `hash_de_${texto}`),
      comparar: jest.fn(),
    };
  });

  it('debe generar usuario con formato dni@sofia.edu y hash de contraseña igual al DNI', async () => {
    const generador = new GeneradorCredenciales(mockServicioHash);
    const resultado = await generador.generarParaDni('72345678');

    expect(resultado.correo).toBe('72345678@sofia.edu');
    expect(resultado.passwordHash).toBe('hash_de_72345678');
    expect(mockServicioHash.generarHash).toHaveBeenCalledWith('72345678');
  });

  it('debe recortar espacios antes de validar y generar', async () => {
    const generador = new GeneradorCredenciales(mockServicioHash);
    const resultado = await generador.generarParaDni('  87654321  ');

    expect(resultado.correo).toBe('87654321@sofia.edu');
    expect(resultado.passwordHash).toBe('hash_de_87654321');
    expect(mockServicioHash.generarHash).toHaveBeenCalledWith('87654321');
  });

  it('debe lanzar error de validación si el DNI no tiene 8 dígitos numéricos', async () => {
    const generador = new GeneradorCredenciales(mockServicioHash);

    await expect(generador.generarParaDni('1234567')).rejects.toThrow(
      'El DNI debe tener exactamente 8 digitos numericos para generar credenciales.'
    );

    await expect(generador.generarParaDni('123456789')).rejects.toThrow(
      'El DNI debe tener exactamente 8 digitos numericos para generar credenciales.'
    );

    await expect(generador.generarParaDni('1234567A')).rejects.toThrow(
      'El DNI debe tener exactamente 8 digitos numericos para generar credenciales.'
    );

    await expect(generador.generarParaDni('')).rejects.toThrow(
      'El DNI debe tener exactamente 8 digitos numericos para generar credenciales.'
    );
  });
});
