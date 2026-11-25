import { CargaMasiva, ErrorAccesoDenegado, FilaCargaMasiva, RolUsuario, Sede, SedeRepository, Usuario } from '../dominio';
import { PersistenciaCargaMasiva } from './carga-masiva.port';
import { leerYValidarExcel } from './leer-excel';

const FILAS_POR_LOTE = 50;

export class PrepararCargaMasivaUseCase {
  constructor(
    private readonly persistencia: PersistenciaCargaMasiva,
    private readonly sedes: SedeRepository,
    private readonly generarId: () => string,
    private readonly limites: { maxMb?: number; maxFilas?: number },
  ) {}

  async ejecutar(archivo: Buffer, administrador: Usuario): Promise<string> {
    if (!administrador.id || !administrador.activo || administrador.rol !== RolUsuario.Administrador) {
      throw new ErrorAccesoDenegado('Solo un administrador activo puede registrar estudiantes.');
    }
    const sedeId = administrador.sedeId ?? null;
    const sedeAdmin = sedeId ? await this.sedes.buscarPorId(sedeId) : null;
    if (sedeId && !sedeAdmin) {
      throw new ErrorAccesoDenegado('La sede del administrador no está disponible.');
    }
    const lectura = await leerYValidarExcel(archivo, { ...this.limites, exigirColumnaSede: true, sedeAdminNombre: sedeAdmin?.nombre });
    const carga = new CargaMasiva({
      id: this.generarId(),
      usuarioId: Number(administrador.id),
      sedeId: sedeId ? Number(sedeId) : null,
      totalFilas: lectura.filasValidas.length + lectura.filaRechazadas.length,
    });
    for (const rechazo of lectura.filaRechazadas) {
      carga.agregarRechazo(rechazo.fila, rechazo.motivo);
    }
    const filas: FilaCargaMasiva[] = [];
    const sedes = new Map<string, Sede | null>();
    for (const fila of lectura.filasValidas) {
      const clave = fila.sede.toUpperCase();
      if (!sedes.has(clave)) {
        sedes.set(clave, sedeAdmin ?? await this.sedes.buscarPorNombre(fila.sede));
      }
      const sede = sedes.get(clave);
      if (!sede?.id || fila.nombre.length > 255 || fila.carrera.length > 100) {
        carga.agregarRechazo(fila.numeroFila, sede?.id ? 'El nombre o la carrera supera la longitud admitida.' : 'La sede no existe.');
        continue;
      }
      filas.push({
        cargaId: carga.id, numeroLote: Math.floor(filas.length / FILAS_POR_LOTE) + 1,
        numeroFila: fila.numeroFila, nombre: fila.nombre, dni: fila.dni,
        sedeId: Number(sede.id), carrera: fila.carrera,
      });
    }
    if (filas.length === 0) {
      carga.marcarComoCompletada();
    }
    await this.persistencia.transaccion(async ({ cargas, guardarEnvios }) => {
      await cargas.guardar(carga);
      await cargas.guardarFilas(filas);
      await guardarEnvios(carga.id, Math.ceil(filas.length / FILAS_POR_LOTE));
    });
    return carga.id;
  }
}
