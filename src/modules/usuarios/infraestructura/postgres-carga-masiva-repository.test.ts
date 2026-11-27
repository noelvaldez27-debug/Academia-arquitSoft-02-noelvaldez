import { Pool } from 'pg';
import { PostgresCargaMasivaRepository } from './postgres-carga-masiva-repository';
import { CargaMasiva } from '../dominio';

describe('PostgresCargaMasivaRepository (CA-U13)', () => {
  let mockPool: Partial<Pool>;
  let mockQuery: jest.Mock;
  let repository: PostgresCargaMasivaRepository;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };
    repository = new PostgresCargaMasivaRepository(mockPool as Pool);
  });

  describe('guardar', () => {
    it('debe ejecutar INSERT en cargas_masivas con parámetros correctos', async () => {
      const carga = new CargaMasiva({
        id: 'c-1',
        usuarioId: 10,
        sedeId: 2,
        totalFilas: 100,
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.guardar(carga);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('INSERT INTO cargas_masivas');
      expect(queryCall[1]).toEqual([
        'c-1',
        10,
        2,
        'PENDIENTE',
        100,
        0,
        0,
        0,
        '[]',
        '[]',
        carga.creadoEn,
        carga.actualizadoEn,
        null,
        0,
        false,
      ]);
    });
  });

  describe('buscarPorId', () => {
    it('debe devolver null si no encuentra la carga masiva', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const resultado = await repository.buscarPorId('no-existe');

      expect(resultado).toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT c.id, c.usuario_id'), ['no-existe']);
    });

    it('debe devolver la CargaMasiva mapeada cuando existe', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'c-1',
            usuario_id: 5,
            sede_id: 1,
            estado: 'COMPLETADA',
            total_filas: 50,
            creadas: 40,
            ya_existian: 5,
            rechazadas: 5,
            errores: JSON.stringify([{ fila: 2, motivo: 'DNI repetido' }]),
            creado_en: new Date('2026-11-20T10:00:00Z'),
            actualizado_en: new Date('2026-11-20T10:05:00Z'),
            ciclo_id: '00000000-0000-4000-8000-000000000001',
            recuperadas: 2,
            vinculadas: 3,
            importacion_automatica: true,
            ciclo_nombre: 'Ciclo sintético',
          },
        ],
      });

      const resultado = await repository.buscarPorId('c-1');

      expect(resultado).not.toBeNull();
      expect(resultado?.id).toBe('c-1');
      expect(resultado?.usuarioId).toBe(5);
      expect(resultado?.sedeId).toBe(1);
      expect(resultado?.estado).toBe('COMPLETADA');
      expect(resultado?.creadas).toBe(40);
      expect(resultado?.yaExistian).toBe(5);
      expect(resultado?.rechazadas).toBe(5);
      expect(resultado?.cicloId).toBe('00000000-0000-4000-8000-000000000001');
      expect(resultado?.cicloNombre).toBe('Ciclo sintético');
      expect(resultado?.recuperadas).toBe(2);
      expect(resultado?.vinculadas).toBe(3);
      expect(resultado?.importacionAutomatica).toBe(true);
      expect(resultado?.errores).toEqual([{ fila: 2, motivo: 'DNI repetido' }]);
    });
  });

  describe('actualizar', () => {
    it('debe actualizar los contadores y estado de la carga', async () => {
      const carga = new CargaMasiva({
        id: 'c-1',
        usuarioId: 1,
        sedeId: null,
      });
      carga.marcarComoProcesando();
      carga.incrementarCreadas(10);
      carga.incrementarVinculadas();
      carga.agregarRechazo(3, 'Sede invalida');

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.actualizar(carga);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('UPDATE cargas_masivas');
      expect(queryCall[1]).toEqual([
        'PROCESANDO',
        10,
        0,
        1,
        JSON.stringify([{ fila: 3, motivo: 'Sede invalida' }]),
        '[]',
        carga.actualizadoEn,
        'c-1',
        0,
        1,
      ]);
    });
  });

  describe('guardarFilas y obtenerFilasPorLote', () => {
    it('debe insertar filas en bloques correctamente', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.guardarFilas([
        {
          cargaId: 'c-1',
          numeroLote: 1,
          numeroFila: 2,
          nombre: 'Juan Perez',
          dni: '12345678',
          sedeId: 1,
          carrera: 'MEDICINA',
        },
      ]);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const call = mockQuery.mock.calls[0];
      expect(call[0]).toContain('INSERT INTO filas_carga_masiva');
      expect(call[1]).toEqual(['c-1', 1, 2, 'Juan Perez', '12345678', 1, 'MEDICINA', 'PENDIENTE', null]);
    });

    it('no debe hacer query si la lista de filas esta vacia', async () => {
      await repository.guardarFilas([]);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('debe obtener filas por lote ordenadas por numero de fila', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 101,
            carga_id: 'c-1',
            numero_lote: 1,
            numero_fila: 2,
            nombre: 'Juan Perez',
            dni: '12345678',
            sede_id: 1,
            carrera: 'MEDICINA',
            estado: 'PENDIENTE',
          },
        ],
      });

      const filas = await repository.obtenerFilasPorLote('c-1', 1);

      expect(filas.length).toBe(1);
      expect(filas[0]).toEqual({
        id: 101,
        cargaId: 'c-1',
        numeroLote: 1,
        numeroFila: 2,
        nombre: 'Juan Perez',
        dni: '12345678',
        sedeId: 1,
        carrera: 'MEDICINA',
        estado: 'PENDIENTE',
      });
    });

    it('debe contar lotes correctamente', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_lotes: 5 }],
      });

      const total = await repository.contarLotes('c-1');
      expect(total).toBe(5);
    });

    it('debe marcar una fila como procesada', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await repository.marcarFilaProcesada(101, 'PROCESADA');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE filas_carga_masiva'),
        ['PROCESADA', 101]
      );
    });
  });
});
