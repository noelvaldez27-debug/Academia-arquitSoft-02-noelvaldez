import { AlcanceAdministrador, CargaMasivaRepository, ErrorAccesoDenegado, ErrorNoEncontrado, RolUsuario } from '../dominio';
import { EjecutorAccion } from './registrar-estudiante.command';

export class ConsultarCargaMasivaUseCase {
  constructor(private readonly cargas: CargaMasivaRepository) {}

  async ejecutar(id: string, administrador: EjecutorAccion) {
    if (administrador.rol !== RolUsuario.Administrador) {
      throw new ErrorAccesoDenegado('Solo un administrador puede consultar cargas.');
    }
    const carga = await this.cargas.buscarPorId(id);
    if (!carga) throw new ErrorNoEncontrado('Carga masiva no encontrada.');
    if (administrador.alcanceAdministrador !== AlcanceAdministrador.General &&
        (carga.sedeId === null || String(carga.sedeId) !== administrador.sedeId)) {
      throw new ErrorAccesoDenegado('La carga no corresponde a la sede del administrador.');
    }
    return {
      id: carga.id, estado: carga.estado, totalFilas: carga.totalFilas,
      creadas: carga.creadas, yaExistian: carga.yaExistian, rechazadas: carga.rechazadas,
      errores: carga.errores, avisos: carga.avisos,
      ...(carga.cicloId && { cicloId: carga.cicloId, recuperadas: carga.recuperadas }),
    };
  }
}
