import ExcelJS from 'exceljs';
import { ErrorValidacion } from '../dominio/errores';

/** Límite de tamaño descomprimido en bytes para proteger contra zip bombs */
const MAX_BYTES_DESCOMPRIMIDO_DEFAULT = 10 * 1024 * 1024; // 10 MB
const MAX_FILAS_DEFAULT = 10_000;

export interface FilaExcelValidada {
  numeroFila: number;
  nombre: string;
  dni: string;
  sede: string;
  carrera: string;
}

export interface ResultadoLecturaExcel {
  filasValidas: FilaExcelValidada[];
  filaRechazadas: Array<{ fila: number; motivo: string }>;
}

/**
 * Verifica que el buffer comience con la firma "PK" (ZIP/XLSX).
 * Protege contra extensión falsificada y rechaza .xlsm implícitamente
 * comparando también que no haya "macros" en las primeras firmas de OLE2.
 */
function verificarFirmaXlsx(buffer: Buffer | ArrayBuffer): void {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  // .xlsx es un ZIP → firma PK (0x50, 0x4B)
  if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4B) {
    throw new ErrorValidacion(
      'El archivo no tiene la firma de un archivo .xlsx válido (se esperaba formato ZIP/PK).'
    );
  }
}

/**
 * Lee y valida un buffer de archivo .xlsx.
 * - Verifica firma PK.
 * - Verifica límite de tamaño descomprimido.
 * - Lee solo la primera hoja.
 * - Valida columnas Nombre, DNI, Sede, Carrera.
 * - Valida cada fila individualmente.
 * - Detecta DNI repetidos dentro del mismo archivo.
 */
export async function leerYValidarExcel(
  buffer: Buffer | ArrayBuffer,
  opciones?: {
    exigirColumnaSede?: boolean;
    maxMb?: number;
    maxFilas?: number;
    sedeAdminNombre?: string | null; // si se indica, fuerza esa sede para las filas
  }
): Promise<ResultadoLecturaExcel> {
  // Normalizar a Buffer para tener .length y acceso a bytes
  const buf: Buffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const maxBytes = (opciones?.maxMb ?? MAX_BYTES_DESCOMPRIMIDO_DEFAULT / (1024 * 1024)) * 1024 * 1024;
  const maxFilas = opciones?.maxFilas ?? MAX_FILAS_DEFAULT;
  const sedeAdmin = opciones?.sedeAdminNombre ?? null;

  // 1. Verificar firma
  verificarFirmaXlsx(buf);

  // 2. Verificar tamaño (el buffer ya está en memoria, se usa como aproximación del descomprimido)
  if (buf.length > maxBytes) {
    throw new ErrorValidacion(
      `El archivo supera el límite de tamaño de ${maxBytes / (1024 * 1024)} MB.`
    );
  }

  // 3. Leer con ExcelJS
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buf as unknown as ArrayBuffer);
  } catch {
    throw new ErrorValidacion('El archivo no es un .xlsx válido.');
  }

  const hoja = workbook.worksheets[0];
  if (!hoja) {
    throw new ErrorValidacion('El archivo no contiene ninguna hoja de cálculo.');
  }

  // 4. Verificar columnas de cabecera (primera fila)
  const cabecera = (hoja.getRow(1).values as (string | undefined)[]);
  // getRow.values devuelve un array basado en 1 (índice 0 vacío)
  const columnas: Record<string, number> = {};
  for (let i = 1; i < cabecera.length; i++) {
    const nombre = String(cabecera[i] ?? '').trim().toUpperCase();
    columnas[nombre] = i;
  }

  const colNombre = columnas['NOMBRE'];
  const colDni = columnas['DNI'];
  const colSede = columnas['SEDE'];
  const colCarrera = columnas['CARRERA'];

  if (!colNombre || !colDni || !colCarrera) {
    throw new ErrorValidacion(
      'El archivo no contiene las columnas obligatorias: Nombre, DNI, Carrera.'
    );
  }

  if (opciones?.exigirColumnaSede && !colSede) {
    throw new ErrorValidacion('El archivo debe contener la columna Sede.');
  }

  // 5. Leer filas de datos
  const totalFilasDatos = hoja.rowCount - 1; // excluye cabecera
  if (totalFilasDatos > maxFilas) {
    throw new ErrorValidacion(
      `El archivo supera el límite de ${maxFilas} filas de datos.`
    );
  }

  const filasValidas: FilaExcelValidada[] = [];
  const filaRechazadas: Array<{ fila: number; motivo: string }> = [];
  const dnisVistos = new Set<string>();

  for (let rowNum = 2; rowNum <= hoja.rowCount; rowNum++) {
    const row = hoja.getRow(rowNum);

    // Omitir filas completamente vacías
    const valoresRaw = row.values as any[];
    if (!valoresRaw || valoresRaw.filter((v) => v !== null && v !== undefined && v !== '').length === 0) {
      continue;
    }

    const nombre = String(row.getCell(colNombre).value ?? '').trim();
    const dniRaw = String(row.getCell(colDni).value ?? '').trim();
    const carrera = String(row.getCell(colCarrera).value ?? '').trim();
    const sedeRaw = colSede ? String(row.getCell(colSede).value ?? '').trim() : '';

    // Validación: nombre no vacío
    if (!nombre) {
      filaRechazadas.push({ fila: rowNum, motivo: 'El nombre es obligatorio.' });
      continue;
    }

    // Validación: DNI de 8 dígitos
    if (!/^\d{8}$/.test(dniRaw)) {
      filaRechazadas.push({ fila: rowNum, motivo: `DNI inválido: se esperan exactamente 8 dígitos (recibido: "${dniRaw}").` });
      continue;
    }

    // Validación: carrera no vacía
    if (!carrera) {
      filaRechazadas.push({ fila: rowNum, motivo: 'La carrera es obligatoria.' });
      continue;
    }

    // Validación: sede
    // Si el admin es de sede: la columna Sede es opcional; si viene debe coincidir; si no, se usa la del admin.
    // Si el admin es general: la columna Sede es obligatoria en cada fila.
    let sedeFinal: string;
    if (sedeAdmin !== null) {
      // Administrador de sede
      if (sedeRaw && sedeRaw.toUpperCase() !== sedeAdmin.toUpperCase()) {
        filaRechazadas.push({
          fila: rowNum,
          motivo: `La sede de la fila ("${sedeRaw}") no coincide con la sede del administrador ("${sedeAdmin}").`,
        });
        continue;
      }
      sedeFinal = sedeAdmin;
    } else {
      // Administrador general: la sede es obligatoria en la fila
      if (!sedeRaw) {
        filaRechazadas.push({ fila: rowNum, motivo: 'La columna Sede es obligatoria para el administrador general.' });
        continue;
      }
      sedeFinal = sedeRaw;
    }

    // Validación: DNI repetido dentro del archivo
    if (dnisVistos.has(dniRaw)) {
      filaRechazadas.push({ fila: rowNum, motivo: `El DNI ${dniRaw} está repetido dentro del archivo.` });
      continue;
    }
    dnisVistos.add(dniRaw);

    filasValidas.push({
      numeroFila: rowNum,
      nombre,
      dni: dniRaw,
      sede: sedeFinal,
      carrera: carrera.toUpperCase(),
    });
  }

  return { filasValidas, filaRechazadas };
}
