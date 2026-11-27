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

  describe('formatos habituales de Excel', () => {
    it('lee una plantilla sintética con filas vacías, numeración, aliases y orden diferente', async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Ficticio');
      ws.addRow([]);
      ws.addRow(['   ']);
      ws.addRow(['N°', ' CEDE ', ' documento de identidad ', ' Nombres ', ' Carrera profesional ', 'Comentario extra']);
      ws.addRow([1, ' hAnA ', 12345678, '  Estudiante   Ficticio Uno ', ' medicina   humana ', 'ignorar']);
      ws.addRow([2, 'URIN', '87654321', 'Estudiante Ficticio Dos', 'DERECHO', 'ignorar']);
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());

      const resultado = await leerYValidarExcel(buffer, { sedeAdminNombre: null, exigirColumnaSede: true });

      expect(resultado.filasValidas).toEqual([
        { numeroFila: 4, nombre: 'Estudiante Ficticio Uno', dni: '12345678', sede: 'hAnA', carrera: 'MEDICINA HUMANA' },
        { numeroFila: 5, nombre: 'Estudiante Ficticio Dos', dni: '87654321', sede: 'URIN', carrera: 'DERECHO' },
      ]);
      expect(resultado.filaRechazadas).toEqual([]);
    });

    it('mantiene el formato original', async () => {
      const buffer = await crearBufferXlsx([{ Nombre: 'Estudiante Ficticio', DNI: '12345678', Sede: 'Hana', Carrera: 'medicina' }]);
      const resultado = await leerYValidarExcel(buffer, { sedeAdminNombre: null, exigirColumnaSede: true });
      expect(resultado.filasValidas[0]).toMatchObject({ numeroFila: 2, nombre: 'Estudiante Ficticio', dni: '12345678', sede: 'Hana', carrera: 'MEDICINA' });
    });

    it('rechaza encabezados duplicados equivalentes con una explicación', async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Ficticio');
      ws.addRow(['NOMBRE', 'NOMBRES', 'DNI', 'CARRERA', 'SEDE']);
      ws.addRow(['Ficticio', 'Ficticio', '12345678', 'MEDICINA', 'Hana']);
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      await expect(leerYValidarExcel(buffer, { sedeAdminNombre: null, exigirColumnaSede: true }))
        .rejects.toThrow('Encabezados duplicados o ambiguos para: NOMBRE');
    });

    it('rechaza DNI numérico que perdió dígitos y no rellena ceros', async () => {
      const buffer = await crearBufferXlsx([{ Nombre: 'Estudiante Ficticio', DNI: 1234567, Sede: 'Hana', Carrera: 'MEDICINA' }]);
      const resultado = await leerYValidarExcel(buffer, { sedeAdminNombre: null, exigirColumnaSede: true });
      expect(resultado.filaRechazadas[0]).toMatchObject({ fila: 2 });
      expect(resultado.filaRechazadas[0].motivo).toContain('DNI inválido');
    });

    it('rechaza discrepancia de sede y conserva el número físico de fila', async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Ficticio');
      ws.addRow(['NOMBRES', 'DNI', 'CARRERA', 'CEDE']);
      ws.addRow(['Estudiante Ficticio', '12345678', 'MEDICINA', 'Urin']);
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      const resultado = await leerYValidarExcel(buffer, { sedeAdminNombre: 'Hana' });
      expect(resultado.filaRechazadas[0]).toMatchObject({ fila: 2 });
      expect(resultado.filaRechazadas[0].motivo).toContain('no coincide');
    });

    it('permite omitir sede a un administrador de sede y la asigna desde su sesión', async () => {
      const buffer = await crearBufferXlsx([{ Nombre: 'Estudiante Ficticio', DNI: '12345678', Carrera: 'MEDICINA' }], ['Nombre', 'DNI', 'Carrera']);
      const resultado = await leerYValidarExcel(buffer, { sedeAdminNombre: 'Hana' });
      expect(resultado.filasValidas[0].sede).toBe('Hana');
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

      await expect(leerYValidarExcel(buffer, { sedeAdminNombre: null, exigirColumnaSede: true }))
        .rejects.toThrow('El archivo debe contener la columna Sede.');
    });
  });
});
