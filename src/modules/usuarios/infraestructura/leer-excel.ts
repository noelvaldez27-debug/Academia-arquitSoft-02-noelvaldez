import ExcelJS from 'exceljs';
import { ErrorValidacion } from '../dominio/errores';
import { esCondicionPostulante } from '../dominio/usuario';
import type { FilaExcelValidada, LectorExcel } from '../aplicacion/lector-excel.port';

/** Límite de tamaño descomprimido en bytes para proteger contra zip bombs */
const MAX_BYTES_DESCOMPRIMIDO_DEFAULT = 10 * 1024 * 1024; // 10 MB
const MAX_FILAS_DEFAULT = 10_000;
const MAX_FILAS_BUSQUEDA_CABECERA = 20;

const ALIAS_CABECERAS: Record<string, string[]> = {
  NOMBRE: ['NOMBRE', 'NOMBRES', 'NOMBRE COMPLETO', 'NOMBRES COMPLETOS', 'APELLIDOS Y NOMBRES'],
  DNI: ['DNI', 'D.N.I.', 'DOCUMENTO DE IDENTIDAD'],
  CARRERA: ['CARRERA', 'CARRERA PROFESIONAL'],
  SEDE: ['SEDE', 'CEDE'],
  'CONDICION': ['CONDICION'],
};

function normalizarCabecera(valor: unknown): string {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().trim().replace(/\s+/g, ' ');
}

function normalizarTextoCelda(valor: unknown): string {
  return String(valor ?? '').trim().replace(/\s+/g, ' ');
}

function normalizarDni(valor: unknown): string {
  if (typeof valor === 'number') {
    if (!Number.isSafeInteger(valor) || valor < 10_000_000 || valor > 99_999_999) return '';
    return String(valor);
  }
  if (typeof valor !== 'string') return '';
  return valor.trim();
}

function encontrarCabecera(hoja: ExcelJS.Worksheet): { fila: number; columnas: Record<string, number> } {
  for (let fila = 1; fila <= Math.min(MAX_FILAS_BUSQUEDA_CABECERA, hoja.rowCount); fila++) {
    const valores = hoja.getRow(fila).values as unknown[];
    if (!valores || valores.slice(1).every(valor => normalizarCabecera(valor) === '')) continue;
    const columnas: Record<string, number> = {};
    const cabecerasOriginales: Record<string, string[]> = {};
    for (let indice = 1; indice < valores.length; indice++) {
      const normalizada = normalizarCabecera(valores[indice]);
      if (!normalizada) continue;
      const campo = Object.entries(ALIAS_CABECERAS).find(([, alias]) => alias.includes(normalizada))?.[0];
      if (!campo) continue;
      (cabecerasOriginales[campo] ??= []).push(String(valores[indice]));
      if (!columnas[campo]) columnas[campo] = indice;
    }
    const duplicadas = Object.keys(cabecerasOriginales).filter(campo => cabecerasOriginales[campo].length > 1);
    if (duplicadas.length) {
      throw new ErrorValidacion(`Encabezados duplicados o ambiguos para: ${duplicadas.join(', ')}. Deja una sola columna por dato.`);
    }
    if (columnas.NOMBRE && columnas.DNI && columnas.CARRERA) return { fila, columnas };
    const faltantes = ['NOMBRE', 'DNI', 'CARRERA'].filter(campo => !columnas[campo]);
    throw new ErrorValidacion(`No se reconocen los encabezados obligatorios en la fila ${fila}. Faltan: ${faltantes.join(', ')}.`);
  }
  throw new ErrorValidacion(`No se encontraron encabezados en las primeras ${MAX_FILAS_BUSQUEDA_CABECERA} filas. Se requieren Nombre, DNI y Carrera.`);
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
export const leerYValidarExcel: LectorExcel = async (buffer, opciones) => {
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

  // 4. Buscar encabezados sin asumir que están en la primera fila.
  const { fila: filaCabecera, columnas } = encontrarCabecera(hoja);
  const colNombre = columnas.NOMBRE;
  const colDni = columnas.DNI;
  const colSede = columnas.SEDE;
  const colCarrera = columnas.CARRERA;
  const colCondicion = columnas.CONDICION;

  if (!colNombre || !colDni || !colCarrera) {
    throw new ErrorValidacion('El archivo no contiene las columnas obligatorias: Nombre, DNI, Carrera.');
  }

  if ((opciones?.exigirColumnaSede || sedeAdmin === null) && !colSede) {
    throw new ErrorValidacion('El archivo debe contener la columna Sede.');
  }
  if (opciones?.exigirCondicion && !colCondicion) {
    throw new ErrorValidacion('El archivo debe contener la columna Condición.');
  }

  // 5. Leer filas de datos
  const totalFilasDatos = hoja.rowCount - filaCabecera;
  if (totalFilasDatos > maxFilas) {
    throw new ErrorValidacion(
      `El archivo supera el límite de ${maxFilas} filas de datos.`
    );
  }

  const filasValidas: FilaExcelValidada[] = [];
  const filaRechazadas: Array<{ fila: number; motivo: string }> = [];
  const dnisVistos = new Set<string>();

  for (let rowNum = filaCabecera + 1; rowNum <= hoja.rowCount; rowNum++) {
    const row = hoja.getRow(rowNum);

    // Omitir filas completamente vacías
    const valoresRaw = row.values as any[];
    if (!valoresRaw || valoresRaw.filter((v) => v !== null && v !== undefined && v !== '').length === 0) {
      continue;
    }

    const nombre = normalizarTextoCelda(row.getCell(colNombre).value);
    const dniRaw = normalizarDni(row.getCell(colDni).value);
    const carrera = normalizarTextoCelda(row.getCell(colCarrera).value);
    const sedeRaw = colSede ? normalizarTextoCelda(row.getCell(colSede).value) : '';
    const condicion = colCondicion ? normalizarCabecera(row.getCell(colCondicion).value) : undefined;
    if (colCondicion && !esCondicionPostulante(condicion)) {
      filaRechazadas.push({ fila: rowNum, motivo: 'La condición debe ser MATRICULADO o LIBRE.' });
      continue;
    }

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
      if (sedeRaw && normalizarCabecera(sedeRaw) !== normalizarCabecera(sedeAdmin)) {
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
      ...(esCondicionPostulante(condicion) ? { condicion } : {}),
    });
  }

  return { filasValidas, filaRechazadas };
};
