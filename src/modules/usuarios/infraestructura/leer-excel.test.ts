import ExcelJS from 'exceljs';
import { leerYValidarExcel } from './leer-excel';
import { ErrorValidacion } from '../dominio/errores';

/** Genera un buffer xlsx de prueba en memoria */
async function crearBufferXlsx(
  filas: Array<Record<string, string | number>>,
  cabeceras: string[] = ['Nombre', 'DNI', 'Sede', 'Carrera'],
  esXlsm = false
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow(cabeceras);
  for (const fila of filas) {
    ws.addRow(cabeceras.map((c) => fila[c] ?? ''));
  }
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('leerYValidarExcel (CA-U13)', () => {
  describe('validaciones del archivo completo', () => {
    it('debe rechazar un buffer que no tiene firma PK (no es xlsx)', async () => {
      const bufferFalso = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      await expect(leerYValidarExcel(bufferFalso)).rejects.toThrow(ErrorValidacion);
    });

    it('debe rechazar un archivo que supera el limite de tamaño', async () => {
      const buffer = await crearBufferXlsx([{ Nombre: 'Juan', DNI: '12345678', Sede: 'Hana', Carrera: 'MEDICINA' }]);
      await expect(leerYValidarExcel(buffer, { maxMb: 0.000001 })).rejects.toThrow(
        ErrorValidacion
      );
    });

    it('debe rechazar un archivo que supera el numero maximo de filas', async () => {
      const filas = Array.from({ length: 5 }, (_, i) => ({
        Nombre: `Alumno ${i}`,
        DNI: `1234000${i}`,
        Sede: 'Hana',
        Carrera: 'MEDICINA',
      }));
      const buffer = await crearBufferXlsx(filas);
      await expect(leerYValidarExcel(buffer, { maxFilas: 2 })).rejects.toThrow(ErrorValidacion);
    });

    it('debe rechazar un archivo sin las columnas obligatorias', async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Hoja1');
      ws.addRow(['Columna1', 'Columna2']);
      ws.addRow(['Valor1', 'Valor2']);
      const arrayBuffer = await wb.xlsx.writeBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await expect(leerYValidarExcel(buffer)).rejects.toThrow(ErrorValidacion);
    });
  });

  describe('validaciones por fila', () => {
    it('debe aceptar filas validas y retornar resultados correctos', async () => {
      const buffer = await crearBufferXlsx([
        { Nombre: 'Juan Perez', DNI: '12345678', Sede: 'Hana', Carrera: 'medicina' },
        { Nombre: 'Maria Lopez', DNI: '87654321', Sede: 'Urin', Carrera: 'DERECHO' },
      ]);

      const resultado = await leerYValidarExcel(buffer);

      expect(resultado.filasValidas).toHaveLength(2);
      expect(resultado.filaRechazadas).toHaveLength(0);
      expect(resultado.filasValidas[0].carrera).toBe('MEDICINA'); // normalizada a mayusculas
    });

    it('debe rechazar una fila con DNI que no tiene 8 digitos', async () => {
      const buffer = await crearBufferXlsx([
        { Nombre: 'Juan Perez', DNI: '123456', Sede: 'Hana', Carrera: 'MEDICINA' },
      ]);

      const resultado = await leerYValidarExcel(buffer);

      expect(resultado.filasValidas).toHaveLength(0);
      expect(resultado.filaRechazadas).toHaveLength(1);
      expect(resultado.filaRechazadas[0].fila).toBe(2);
      expect(resultado.filaRechazadas[0].motivo).toContain('DNI inválido');
    });

    it('debe rechazar una fila con nombre vacio', async () => {
      const buffer = await crearBufferXlsx([
        { Nombre: '', DNI: '12345678', Sede: 'Hana', Carrera: 'MEDICINA' },
      ]);

      const resultado = await leerYValidarExcel(buffer);

      expect(resultado.filasValidas).toHaveLength(0);
      expect(resultado.filaRechazadas[0].motivo).toContain('nombre es obligatorio');
    });

    it('debe rechazar una fila con carrera vacia', async () => {
      const buffer = await crearBufferXlsx([
        { Nombre: 'Juan', DNI: '12345678', Sede: 'Hana', Carrera: '' },
      ]);

      const resultado = await leerYValidarExcel(buffer);

      expect(resultado.filasValidas).toHaveLength(0);
      expect(resultado.filaRechazadas[0].motivo).toContain('carrera es obligatoria');
    });

    it('debe rechazar un DNI repetido dentro del mismo archivo', async () => {
      const buffer = await crearBufferXlsx([
        { Nombre: 'Juan', DNI: '12345678', Sede: 'Hana', Carrera: 'MEDICINA' },
        { Nombre: 'Juan Duplicado', DNI: '12345678', Sede: 'Hana', Carrera: 'DERECHO' },
      ]);

      const resultado = await leerYValidarExcel(buffer);

      expect(resultado.filasValidas).toHaveLength(1);
      expect(resultado.filaRechazadas).toHaveLength(1);
      expect(resultado.filaRechazadas[0].motivo).toContain('repetido dentro del archivo');
    });

    it('debe procesar filas mezcladas validas e invalidas', async () => {
      const buffer = await crearBufferXlsx([
        { Nombre: 'Valido 1', DNI: '11111111', Sede: 'Hana', Carrera: 'MEDICINA' },
        { Nombre: '', DNI: '22222222', Sede: 'Hana', Carrera: 'DERECHO' },      // nombre vacío
        { Nombre: 'Valido 2', DNI: '33333333', Sede: 'Urin', Carrera: 'FISICA' },
        { Nombre: 'DNI mal', DNI: '123', Sede: 'Hana', Carrera: 'QUIMICA' },   // DNI inválido
        { Nombre: 'Repetido', DNI: '11111111', Sede: 'Hana', Carrera: 'FISICA' }, // repetido
      ]);

      const resultado = await leerYValidarExcel(buffer);

      expect(resultado.filasValidas).toHaveLength(2);
      expect(resultado.filaRechazadas).toHaveLength(3);
    });
  });

  describe('alcance por sede del administrador', () => {
    it('administrador de sede: fila sin columna sede usa la sede del administrador', async () => {
      const buffer = await crearBufferXlsx(
        [{ Nombre: 'Juan', DNI: '12345678', Carrera: 'MEDICINA' }],
        ['Nombre', 'DNI', 'Carrera']
      );

      const resultado = await leerYValidarExcel(buffer, { sedeAdminNombre: 'Hana' });

      expect(resultado.filasValidas).toHaveLength(1);
      expect(resultado.filasValidas[0].sede).toBe('Hana');
    });

    it('administrador de sede: fila con sede correcta pasa', async () => {
      const buffer = await crearBufferXlsx([
        { Nombre: 'Maria', DNI: '12345678', Sede: 'Hana', Carrera: 'MEDICINA' },
      ]);

      const resultado = await leerYValidarExcel(buffer, { sedeAdminNombre: 'Hana' });

      expect(resultado.filasValidas).toHaveLength(1);
    });

    it('administrador de sede: fila con sede diferente se rechaza', async () => {
      const buffer = await crearBufferXlsx([
        { Nombre: 'Pedro', DNI: '12345678', Sede: 'Urin', Carrera: 'MEDICINA' },
      ]);

      const resultado = await leerYValidarExcel(buffer, { sedeAdminNombre: 'Hana' });

      expect(resultado.filasValidas).toHaveLength(0);
      expect(resultado.filaRechazadas[0].motivo).toContain('no coincide con la sede del administrador');
    });

    it('administrador general: fila sin sede se rechaza', async () => {
      const buffer = await crearBufferXlsx(
        [{ Nombre: 'Ana', DNI: '12345678', Carrera: 'MEDICINA' }],
        ['Nombre', 'DNI', 'Carrera']
      );

      const resultado = await leerYValidarExcel(buffer, { sedeAdminNombre: null });

      expect(resultado.filasValidas).toHaveLength(0);
      expect(resultado.filaRechazadas[0].motivo).toContain('Sede es obligatoria');
    });
  });
});
