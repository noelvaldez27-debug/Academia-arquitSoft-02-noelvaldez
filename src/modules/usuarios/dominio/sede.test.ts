import { Sede } from './sede';

describe('Entidad Sede', () => {
  it('debe crear una sede valida y recortar espacios en blanco', () => {
    const sede = new Sede({ id: '1', nombre: '  Hana  ' });
    expect(sede.id).toBe('1');
    expect(sede.nombre).toBe('Hana');
  });

  it('debe permitir crear sede sin ID inicial (generacion en persistencia)', () => {
    const sede = new Sede({ nombre: 'Central' });
    expect(sede.id).toBeUndefined();
    expect(sede.nombre).toBe('Central');
  });

  it('debe lanzar error si el nombre es vacio o solo espacios', () => {
    expect(() => new Sede({ nombre: '' })).toThrow('El nombre de la sede es obligatorio y no puede estar vacio.');
    expect(() => new Sede({ nombre: '   ' })).toThrow('El nombre de la sede es obligatorio y no puede estar vacio.');
  });
});
