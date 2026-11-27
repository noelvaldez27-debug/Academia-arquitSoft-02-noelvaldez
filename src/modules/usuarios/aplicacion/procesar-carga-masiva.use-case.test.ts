import { CargaMasiva, ErrorConflicto, ErrorValidacion, FilaCargaMasiva, RolUsuario } from '../dominio';
import { TransaccionCargaMasiva } from './carga-masiva.port';
import { ProcesarCargaMasivaUseCase } from './procesar-carga-masiva.use-case';

function preparar(importacionAutomatica = false) {
  const carga = new CargaMasiva({ id: 'carga', usuarioId: 1, sedeId: null, totalFilas: 3,
    ...(importacionAutomatica && { importacionAutomatica, cicloId: '12345678-1234-1234-1234-123456789012' }) });
  const filas: FilaCargaMasiva[] = Array.from({ length: importacionAutomatica ? 5 : 3 }, (_, indice) => indice + 1).map(id => ({
    id, cargaId: carga.id, numeroLote: 1, numeroFila: id + 1,
    dni: String(12345677 + id), nombre: 'Nombre del Excel', sedeId: 1,
    carrera: 'MEDICINA', estado: 'PENDIENTE',
  }));
  const ejecutar = jest.fn();
  const modoAutomatico = jest.fn();
  const contexto = {
    cargas: {
      obtenerFilasPorLote: async () => filas,
      contarFilasPendientes: async () => filas.filter(fila => fila.estado === 'PENDIENTE').length,
      marcarFilaProcesada: async (id: number, estado: FilaCargaMasiva['estado']) => {
        filas[id - 1].estado = estado;
      },
      actualizar: jest.fn(),
    },
    bloquearCarga: async () => carga,
    usuarios: {
      buscarPorId: async () => ({ rol: RolUsuario.Administrador, activo: true }),
      buscarPorDni: async () => ({ nombre: 'Nombre privado', activo: false }),
    },
    registro: { ejecutar, modoAutomatico },
  } as unknown as TransaccionCargaMasiva;
  const caso = new ProcesarCargaMasivaUseCase({ transaccion: operacion => operacion(contexto) });
  return { carga, ejecutar, modoAutomatico, caso, lote: { cargaId: carga.id, numeroLote: 1 } };
}

describe('ProcesarCargaMasivaUseCase (CA-U13)', () => {
  it('clasifica altas, recuperaciones, vínculos y existentes del ciclo sin duplicar categorías', async () => {
    const { carga, modoAutomatico, caso, lote } = preparar(true);
    modoAutomatico.mockResolvedValueOnce({ resultado: 'creada' })
      .mockResolvedValueOnce({ resultado: 'recuperada' })
      .mockResolvedValueOnce({ resultado: 'vinculada' })
      .mockResolvedValueOnce({ resultado: 'existente' })
      .mockRejectedValueOnce(new ErrorConflicto('El DNI existente presenta una discrepancia de identidad. Requiere revisión manual.'));
    await caso.ejecutar(lote);
    expect(carga.estado).toBe('COMPLETADA');
    expect(carga.creadas).toBe(1);
    expect(carga.recuperadas).toBe(1);
    expect(carga.vinculadas).toBe(1);
    expect(carga.yaExistian).toBe(1);
    expect(carga.rechazadas).toBe(1);
    expect(carga.avisos).toEqual([{ fila: 6, motivo: 'El DNI requiere revisión manual; no se vinculó ni recuperó la cuenta.' }]);
    expect(modoAutomatico).toHaveBeenCalledTimes(5);
  });

  it('omite el DNI existente inactivo, emite un aviso privado y registra el rechazo por fila', async () => {
    const { carga, ejecutar, caso, lote } = preparar();
    ejecutar.mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ErrorConflicto('Existe'))
      .mockRejectedValueOnce(new ErrorValidacion('Sede inválida'));

    await caso.ejecutar(lote);
    await caso.ejecutar(lote);

    expect(ejecutar).toHaveBeenCalledTimes(3);
    expect(carga.estado).toBe('COMPLETADA');
    expect(carga.creadas).toBe(1);
    expect(carga.yaExistian).toBe(1);
    expect(carga.avisos).toEqual([{ fila: 3, motivo: 'El DNI ya existe con un nombre diferente.' }]);
    expect(carga.errores).toEqual([{ fila: 4, motivo: 'Sede inválida' }]);
  });

  it('reanuda un lote después de un fallo transitorio sin recontar lo procesado', async () => {
    const { carga, ejecutar, caso, lote } = preparar();
    ejecutar.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Fallo transitorio'));

    await expect(caso.ejecutar(lote)).rejects.toThrow('Fallo transitorio');
    expect(carga.creadas).toBe(1);
    await caso.ejecutar(lote);

    expect(carga.estado).toBe('COMPLETADA');
    expect(carga.creadas).toBe(3);
  });

  it('marca la carga fallida si se agotan los intentos con filas pendientes', async () => {
    const { carga, caso, lote } = preparar();
    await caso.marcarFallida(lote);
    expect(carga.estado).toBe('FALLIDA');
  });
});
