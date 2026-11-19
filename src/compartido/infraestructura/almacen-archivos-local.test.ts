import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  AlmacenArchivosLocal,
  obtenerRutaAlmacenLocalDesdeEnv,
} from './almacen-archivos-local';

describe('AlmacenArchivosLocal (Adaptador de almacenamiento en disco)', () => {
  let directorioTemporal: string;
  const envOriginal = process.env;

  beforeEach(async () => {
    process.env = { ...envOriginal };
    directorioTemporal = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), 'evalua-net-almacen-test-')
    );
  });

  afterEach(async () => {
    process.env = envOriginal;
    if (directorioTemporal && fs.existsSync(directorioTemporal)) {
      await fsPromises.rm(directorioTemporal, { recursive: true, force: true });
    }
  });

  describe('obtenerRutaAlmacenLocalDesdeEnv', () => {
    it('debe retornar la ruta configurada en ALMACEN_LOCAL_PATH', () => {
      process.env.ALMACEN_LOCAL_PATH = './directorio/personalizado';
      expect(obtenerRutaAlmacenLocalDesdeEnv()).toBe('./directorio/personalizado');
    });

    it('debe lanzar error si ALMACEN_LOCAL_PATH no está definida', () => {
      delete process.env.ALMACEN_LOCAL_PATH;
      expect(() => obtenerRutaAlmacenLocalDesdeEnv()).toThrow(
        'La variable de entorno ALMACEN_LOCAL_PATH no está configurada o está vacía.'
      );
    });

    it('debe lanzar error si ALMACEN_LOCAL_PATH contiene solo espacios en blanco', () => {
      process.env.ALMACEN_LOCAL_PATH = '   ';
      expect(() => obtenerRutaAlmacenLocalDesdeEnv()).toThrow(
        'La variable de entorno ALMACEN_LOCAL_PATH no está configurada o está vacía.'
      );
    });
  });

  describe('Constructor y validaciones base', () => {
    it('debe rechazar un directorio base vacío', () => {
      expect(() => new AlmacenArchivosLocal('')).toThrow(
        'El directorio base de almacenamiento local no puede estar vacío.'
      );
      expect(() => new AlmacenArchivosLocal('   ')).toThrow(
        'El directorio base de almacenamiento local no puede estar vacío.'
      );
    });
  });

  describe('Operaciones de guardado y obtención', () => {
    it('debe guardar un archivo y retornar su ruta absoluta', async () => {
      const almacen = new AlmacenArchivosLocal(directorioTemporal);
      const contenido = Buffer.from('Contenido de prueba de separata');

      const rutaGuardada = await almacen.guardar('separatas/matematica.pdf', contenido);

      expect(fs.existsSync(rutaGuardada)).toBe(true);
      const leido = await fsPromises.readFile(rutaGuardada);
      expect(leido.toString()).toBe('Contenido de prueba de separata');
    });

    it('debe obtener el contenido previamente guardado', async () => {
      const almacen = new AlmacenArchivosLocal(directorioTemporal);
      const contenido = Buffer.from('Texto extraído');

      await almacen.guardar('subcarpeta/archivo.txt', contenido);
      const obtenido = await almacen.obtener('subcarpeta/archivo.txt');

      expect(obtenido.toString()).toBe('Texto extraído');
    });

    it('debe lanzar un error claro cuando el archivo a obtener no existe', async () => {
      const almacen = new AlmacenArchivosLocal(directorioTemporal);

      await expect(almacen.obtener('inexistente.pdf')).rejects.toThrow(
        'Archivo no encontrado: inexistente.pdf'
      );
    });

    it('debe propagar otros errores inesperados del sistema de archivos al obtener', async () => {
      const almacen = new AlmacenArchivosLocal(directorioTemporal);
      await fsPromises.mkdir(path.join(directorioTemporal, 'carpeta-prueba'));

      // Intentar leer un directorio como si fuera archivo produce un error distinto de ENOENT (EISDIR / EPERM)
      await expect(almacen.obtener('carpeta-prueba')).rejects.toThrow();
    });
  });

  describe('Seguridad y prevención de Path Traversal', () => {
    it('debe rechazar rutas relativas vacías', async () => {
      const almacen = new AlmacenArchivosLocal(directorioTemporal);

      await expect(almacen.guardar('', Buffer.from('test'))).rejects.toThrow(
        'La ruta relativa no puede estar vacía.'
      );
      await expect(almacen.obtener('   ')).rejects.toThrow(
        'La ruta relativa no puede estar vacía.'
      );
    });

    it('debe rechazar rutas que contienen caracteres nulos', async () => {
      const almacen = new AlmacenArchivosLocal(directorioTemporal);

      await expect(almacen.guardar('test\0.pdf', Buffer.from('test'))).rejects.toThrow(
        'La ruta relativa contiene caracteres nulos inválidos.'
      );
      await expect(almacen.obtener('test\0.pdf')).rejects.toThrow(
        'La ruta relativa contiene caracteres nulos inválidos.'
      );
    });

    it('debe rechazar rutas absolutas', async () => {
      const almacen = new AlmacenArchivosLocal(directorioTemporal);
      const rutaAbsoluta = path.resolve(directorioTemporal, 'archivo.pdf');

      await expect(almacen.guardar(rutaAbsoluta, Buffer.from('test'))).rejects.toThrow(
        'No se permiten rutas absolutas: el acceso debe ser relativo al almacén.'
      );
      await expect(almacen.obtener(rutaAbsoluta)).rejects.toThrow(
        'No se permiten rutas absolutas: el acceso debe ser relativo al almacén.'
      );
    });

    it('debe rechazar intentos de escape con ../', async () => {
      const almacen = new AlmacenArchivosLocal(directorioTemporal);

      await expect(almacen.guardar('../fuera.txt', Buffer.from('test'))).rejects.toThrow(
        'Ruta inválida: intento de acceso fuera del directorio base.'
      );
      await expect(almacen.obtener('../../secreto.txt')).rejects.toThrow(
        'Ruta inválida: intento de acceso fuera del directorio base.'
      );
      await expect(
        almacen.guardar('carpeta/../../fuera.txt', Buffer.from('test'))
      ).rejects.toThrow('Ruta inválida: intento de acceso fuera del directorio base.');
    });

    it('debe rechazar rutas dirigidas a carpetas hermanas con prefijo similar', async () => {
      // Por ejemplo si directorioTemporal es /tmp/base, que no permita /tmp/base-otro
      const baseNombre = path.basename(directorioTemporal);
      const carpetaHermana = `../${baseNombre}-otro/archivo.txt`;

      const almacen = new AlmacenArchivosLocal(directorioTemporal);
      await expect(
        almacen.guardar(carpetaHermana, Buffer.from('test'))
      ).rejects.toThrow('Ruta inválida: intento de acceso fuera del directorio base.');
    });
  });
});
