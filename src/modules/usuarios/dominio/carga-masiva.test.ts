import { CargaMasiva } from './carga-masiva';

describe('Entidad CargaMasiva (CA-U13)', () => {
  it('debe crear una instancia válida de CargaMasiva con valores por defecto', () => {
    const carga = new CargaMasiva({
      id: 'uuid-1234',
      usuarioId: 1,
      sedeId: 2,
    });

    expect(carga.id).toBe('uuid-1234');
    expect(carga.usuarioId).toBe(1);
    expect(carga.sedeId).toBe(2);
    expect(carga.estado).toBe('PENDIENTE');
    expect(carga.totalFilas).toBe(0);
    expect(carga.creadas).toBe(0);
    expect(carga.yaExistian).toBe(0);
    expect(carga.rechazadas).toBe(0);
    expect(carga.errores).toEqual([]);
    expect(carga.creadoEn).toBeInstanceOf(Date);
    expect(carga.actualizadoEn).toBeInstanceOf(Date);
  });

  it('debe fallar si no se proporciona id o es vacío', () => {
    expect(() => new CargaMasiva({ id: '', usuarioId: 1, sedeId: null })).toThrow(
      'El identificador de la carga masiva es obligatorio'
    );
  });

  it('debe fallar si el usuarioId es menor o igual a cero', () => {
    expect(() => new CargaMasiva({ id: 'uuid-1', usuarioId: 0, sedeId: null })).toThrow(
      'El identificador del usuario que sube la carga es obligatorio y positivo'
    );
  });

  it('debe cambiar de estado correctamente', () => {
    const carga = new CargaMasiva({ id: 'uuid-1', usuarioId: 1, sedeId: null });
    carga.marcarComoProcesando();
    expect(carga.estado).toBe('PROCESANDO');

    carga.marcarComoCompletada();
    expect(carga.estado).toBe('COMPLETADA');

    carga.marcarComoFallida();
    expect(carga.estado).toBe('FALLIDA');
  });

  it('debe incrementar creadas y yaExistian', () => {
    const carga = new CargaMasiva({ id: 'uuid-1', usuarioId: 1, sedeId: null });
    carga.incrementarCreadas(5);
    expect(carga.creadas).toBe(5);

    carga.incrementarYaExistian(2);
    expect(carga.yaExistian).toBe(2);
  });

  it('debe registrar rechazos con el detalle de cada fila', () => {
    const carga = new CargaMasiva({ id: 'uuid-1', usuarioId: 1, sedeId: null });
    for (let i = 1; i <= 1005; i++) {
      carga.agregarRechazo(i, `Error fila ${i}`);
    }

    expect(carga.rechazadas).toBe(1005);
    expect(carga.errores.length).toBe(carga.rechazadas);
    expect(carga.errores[0]).toEqual({ fila: 1, motivo: 'Error fila 1' });
  });
});
