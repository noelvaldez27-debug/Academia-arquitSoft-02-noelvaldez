import ExcelJS from 'exceljs';
import { SedeRepository, RolUsuario } from '../dominio';
import { CargaMasiva } from '../dominio/carga-masiva';
import { TransaccionCargaMasiva } from './carga-masiva.port';
import { PrepararCargaMasivaUseCase } from './preparar-carga-masiva.use-case';

async function archivo(columnas: string[], filas: string[][]) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Estudiantes');
  hoja.addRow(columnas);
  hoja.addRows(filas);
  return Buffer.from(await libro.xlsx.writeBuffer());
}

function preparar() {
  const guardar = jest.fn();
  const guardarFilas = jest.fn();
  const guardarEnvios = jest.fn();
  const contexto = { cargas: { guardar, guardarFilas }, guardarEnvios } as unknown as TransaccionCargaMasiva;
  const sedes = {
    buscarPorId: async () => ({ id: '1', nombre: 'Hana' }),
  } as unknown as SedeRepository;
  const caso = new PrepararCargaMasivaUseCase({ transaccion: operacion => operacion(contexto) }, sedes, () => 'id', {});
  const admin = { id: '2', rol: RolUsuario.Administrador, activo: true, sedeId: '1' };
  return { caso, admin, guardar, guardarFilas, guardarEnvios };
}

describe('PrepararCargaMasivaUseCase (CA-U13)', () => {
  it('registra los rechazos por sede y genera envíos por lote', async () => {
    const { caso, admin, guardar, guardarFilas, guardarEnvios } = preparar();
    const filas = Array.from({ length: 51 }, (_, i) => ['Estudiante', String(10000000 + i), 'Hana', 'Medicina']);
    filas.push(['Otra sede', '20000000', 'Urin', 'Medicina']);
    await expect(caso.ejecutar(await archivo(['Nombre', 'DNI', 'Sede', 'Carrera'], filas), admin)).resolves.toBe('id');
    const carga: CargaMasiva = guardar.mock.calls[0][0];
    expect(carga.totalFilas).toBe(52);
    expect(carga.errores).toEqual([{ fila: 53, motivo: expect.any(String) }]);
    expect(guardarFilas.mock.calls[0][0][50].numeroLote).toBe(2);
    expect(guardarEnvios).toHaveBeenCalledWith('id', 2);
  });

  it('rechaza archivos sin la columna Sede y evita escribir la carga', async () => {
    const { caso, admin, guardar } = preparar();
    await expect(caso.ejecutar(await archivo(['Nombre', 'DNI', 'Carrera'], []), admin)).rejects.toThrow('Sede');
    expect(guardar).not.toHaveBeenCalled();
  });
});
