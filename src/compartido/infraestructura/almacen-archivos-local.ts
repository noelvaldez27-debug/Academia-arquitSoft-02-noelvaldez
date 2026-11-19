import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { AlmacenArchivos } from '../aplicacion/almacen-archivos';

/**
 * Obtiene la ruta del directorio de almacenamiento local desde las variables de entorno.
 * Lanza un error explícito si ALMACEN_LOCAL_PATH no está definida o está vacía.
 */
export function obtenerRutaAlmacenLocalDesdeEnv(): string {
  const ruta = process.env.ALMACEN_LOCAL_PATH;
  if (!ruta || ruta.trim() === '') {
    throw new Error(
      'La variable de entorno ALMACEN_LOCAL_PATH no está configurada o está vacía.'
    );
  }
  return ruta.trim();
}

/**
 * Adaptador de almacenamiento de archivos en el sistema de archivos local.
 * Referencia: ADR-012, DA12.
 */
export class AlmacenArchivosLocal implements AlmacenArchivos {
  private readonly directorioBaseAbsoluto: string;

  constructor(directorioBase: string) {
    if (!directorioBase || directorioBase.trim() === '') {
      throw new Error('El directorio base de almacenamiento local no puede estar vacío.');
    }
    this.directorioBaseAbsoluto = path.resolve(directorioBase);
  }

  /**
   * Resuelve y valida la ruta contra el directorio base asegurando que no escape mediante path traversal.
   */
  private resolverRutaSegura(rutaRelativa: string): string {
    if (!rutaRelativa || rutaRelativa.trim() === '') {
      throw new Error('La ruta relativa no puede estar vacía.');
    }

    if (rutaRelativa.includes('\0')) {
      throw new Error('La ruta relativa contiene caracteres nulos inválidos.');
    }

    if (path.isAbsolute(rutaRelativa)) {
      throw new Error('No se permiten rutas absolutas: el acceso debe ser relativo al almacén.');
    }

    const rutaNormalizada = path.normalize(rutaRelativa);
    const rutaDestino = path.resolve(this.directorioBaseAbsoluto, rutaNormalizada);

    // Verificación estricta con path.relative:
    // Si la ruta resultante no está contenida dentro del directorio base, path.relative empieza con '..' o es absoluta (e.g. otra unidad en Windows).
    const relacion = path.relative(this.directorioBaseAbsoluto, rutaDestino);
    if (relacion.startsWith('..') || path.isAbsolute(relacion)) {
      throw new Error('Ruta inválida: intento de acceso fuera del directorio base.');
    }

    return rutaDestino;
  }

  async guardar(rutaRelativa: string, contenido: Buffer): Promise<string> {
    const rutaDestino = this.resolverRutaSegura(rutaRelativa);
    const carpetaPadre = path.dirname(rutaDestino);

    await fsPromises.mkdir(carpetaPadre, { recursive: true });
    await fsPromises.writeFile(rutaDestino, contenido);

    return rutaDestino;
  }

  async obtener(rutaRelativa: string): Promise<Buffer> {
    const rutaDestino = this.resolverRutaSegura(rutaRelativa);

    try {
      return await fsPromises.readFile(rutaDestino);
    } catch (error: any) {
      if (error && error.code === 'ENOENT') {
        throw new Error(`Archivo no encontrado: ${rutaRelativa}`);
      }
      throw error;
    }
  }
}
