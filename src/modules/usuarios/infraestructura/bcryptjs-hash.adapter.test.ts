import { BcryptjsHashAdapter } from './bcryptjs-hash.adapter';

describe('BcryptjsHashAdapter (AC04)', () => {
  it('debe generar un hash valido de bcrypt y verificar correctamente la coincidencia', async () => {
    const adaptador = new BcryptjsHashAdapter(4); // 4 rondas para rapidez en tests
    const textoOriginal = '12345678';

    const hash = await adaptador.generarHash(textoOriginal);

    expect(hash).toBeDefined();
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/); // Formato estándar bcrypt

    const coincide = await adaptador.comparar(textoOriginal, hash);
    expect(coincide).toBe(true);

    const noCoincide = await adaptador.comparar('87654321', hash);
    expect(noCoincide).toBe(false);
  });

  it('debe fallar al generar hash con texto vacio', async () => {
    const adaptador = new BcryptjsHashAdapter(4);
    await expect(adaptador.generarHash('')).rejects.toThrow(
      'El texto para generar hash no puede estar vacio.'
    );
  });

  it('debe retornar false si el texto o hash en comparar estan vacios', async () => {
    const adaptador = new BcryptjsHashAdapter(4);
    expect(await adaptador.comparar('', 'hash')).toBe(false);
    expect(await adaptador.comparar('12345678', '')).toBe(false);
  });
});
