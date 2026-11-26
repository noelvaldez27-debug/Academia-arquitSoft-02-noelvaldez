import { ErrorAccesoDenegado, ErrorConflicto, ErrorNoEncontrado, ErrorValidacion, RolUsuario } from '../dominio';
import { LoteCargaMasiva, PersistenciaCargaMasiva } from './carga-masiva.port';

export class ProcesarCargaMasivaUseCase {
  constructor(private readonly persistencia: PersistenciaCargaMasiva) {}

  async ejecutar(lote: LoteCargaMasiva): Promise<void> {
    const filas = await this.persistencia.transaccion(({ cargas }) =>
      cargas.obtenerFilasPorLote(lote.cargaId, lote.numeroLote)
    );
    for (const candidata of filas) {
      if (candidata.estado !== 'PENDIENTE') continue;
      await this.persistencia.transaccion(async ({ cargas, bloquearCarga, usuarios, registro }) => {
        const carga = await bloquearCarga(lote.cargaId);
        if (carga?.estado !== 'PENDIENTE' && carga?.estado !== 'PROCESANDO') return;
        const actuales = await cargas.obtenerFilasPorLote(lote.cargaId, lote.numeroLote);
        const fila = actuales.find(actual => actual.id === candidata.id);
        if (fila?.id === undefined || fila.estado !== 'PENDIENTE') return;

        carga.marcarComoProcesando();
        const administrador = await usuarios.buscarPorId(String(carga.usuarioId));
        let estado: 'PROCESADA' | 'ERROR' = 'PROCESADA';
        try {
          if (!administrador?.activo || administrador.rol !== RolUsuario.Administrador) {
            throw new ErrorAccesoDenegado('El administrador ya no tiene permisos para registrar estudiantes.');
          }
          let recuperado = false;
          const datos = {
            ejecutor: {
              id: String(carga.usuarioId),
              rol: administrador.rol,
              sedeId: administrador.sedeId,
              alcanceAdministrador: administrador.alcanceAdministrador,
            },
            nombre: fila.nombre, dni: fila.dni, sedeId: String(fila.sedeId), carrera: fila.carrera,
            condicion: fila.condicion,
            cargaId: carga.id,
          };
          if (carga.cicloId) await registro.ejecutar({ ...datos, cicloId: carga.cicloId }, () => { recuperado = true; });
          else await registro.ejecutar(datos);
          if (recuperado) carga.incrementarRecuperadas();
          else carga.incrementarCreadas();
        } catch (error) {
          if (error instanceof ErrorConflicto) {
            const existente = await usuarios.buscarPorDni(fila.dni);
            if (!existente) throw error;
            carga.incrementarYaExistian();
            if (carga.cicloId && existente.activo) carga.agregarAviso(fila.numeroFila, 'El DNI ya tiene una cuenta activa.');
            if (existente.nombre !== fila.nombre) {
              carga.agregarAviso(fila.numeroFila, 'El DNI ya existe con un nombre diferente.');
            }
          } else if (error instanceof ErrorValidacion || error instanceof ErrorAccesoDenegado || error instanceof ErrorNoEncontrado) {
            estado = 'ERROR';
            carga.agregarRechazo(fila.numeroFila, error.message);
          } else {
            throw error;
          }
        }
        await cargas.marcarFilaProcesada(fila.id, estado);
        if (await cargas.contarFilasPendientes(carga.id) === 0) carga.marcarComoCompletada();
        await cargas.actualizar(carga);
      });
    }
  }

  async marcarFallida({ cargaId, numeroLote }: LoteCargaMasiva): Promise<void> {
    await this.persistencia.transaccion(async ({ bloquearCarga, cargas }) => {
      const carga = await bloquearCarga(cargaId);
      if (carga?.estado !== 'PENDIENTE' && carga?.estado !== 'PROCESANDO') return;
      const filas = await cargas.obtenerFilasPorLote(cargaId, numeroLote);
      if (filas.some(fila => fila.estado === 'PENDIENTE')) {
        carga.marcarComoFallida();
        await cargas.actualizar(carga);
      }
    });
  }
}
