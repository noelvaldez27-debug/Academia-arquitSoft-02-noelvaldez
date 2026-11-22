import { Pool } from 'pg';
import { PostgresSedeRepository } from './postgres-sede-repository';
import { Sede } from '../dominio';

describe('PostgresSedeRepository (Pool simulado)', () => {
  let mockPool: Partial<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };
  });

  it('debe guardar una nueva sede y retornar la entidad con ID asignado', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Hana' }],
    });

    const repo = new PostgresSedeRepository(mockPool as Pool);
    const nuevaSede = new Sede({ nombre: 'Hana' });
    const guardada = await repo.guardar(nuevaSede);

    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO sedes (nombre) VALUES ($1) RETURNING id, nombre;',
      ['Hana']
    );
    expect(guardada.id).toBe('1');
    expect(guardada.nombre).toBe('Hana');
  });

  it('debe buscar una sede por ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, nombre: 'Urin' }],
    });

    const repo = new PostgresSedeRepository(mockPool as Pool);
    const sede = await repo.buscarPorId('2');

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT id, nombre FROM sedes WHERE id = $1;',
      [2]
    );
    expect(sede?.id).toBe('2');
    expect(sede?.nombre).toBe('Urin');
  });

  it('debe retornar null si el ID no es numerico o no se encuentra', async () => {
    const repo = new PostgresSedeRepository(mockPool as Pool);

    const sedeInvalida = await repo.buscarPorId('abc');
    expect(sedeInvalida).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();

    mockQuery.mockResolvedValueOnce({ rows: [] });
    const noEncontrada = await repo.buscarPorId('999');
    expect(noEncontrada).toBeNull();
  });

  it('debe buscar una sede por nombre insensible a mayusculas', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 3, nombre: 'Central' }],
    });

    const repo = new PostgresSedeRepository(mockPool as Pool);
    const sede = await repo.buscarPorNombre('  central  ');

    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT id, nombre FROM sedes WHERE LOWER(nombre) = LOWER($1);',
      ['central']
    );
    expect(sede?.id).toBe('3');
    expect(sede?.nombre).toBe('Central');
  });

  it('debe retornar null si no se encuentra la sede por nombre', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const repo = new PostgresSedeRepository(mockPool as Pool);
    const sede = await repo.buscarPorNombre('Inexistente');

    expect(sede).toBeNull();
  });

  it('debe listar todas las sedes ordenadas por ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre: 'Hana' },
        { id: 2, nombre: 'Urin' },
        { id: 3, nombre: 'Central' },
      ],
    });

    const repo = new PostgresSedeRepository(mockPool as Pool);
    const sedes = await repo.listarTodas();

    expect(mockQuery).toHaveBeenCalledWith('SELECT id, nombre FROM sedes ORDER BY id ASC;');
    expect(sedes).toHaveLength(3);
    expect(sedes[0].nombre).toBe('Hana');
    expect(sedes[1].nombre).toBe('Urin');
    expect(sedes[2].nombre).toBe('Central');
  });
});
