import { AlcanceAdministrador, ErrorAccesoDenegado, RolUsuario } from '../dominio';
import type { EjecutorAccion } from './registrar-estudiante.command';

export interface ResumenCarga {
  id: string;
  estado: string;
  creadaEl: Date;
  propia: boolean;
  cicloNombre?: string | null;
}

export class ListarCargasMasivasUseCase {
  constructor(private readonly listar: (
    sedeId: string | null, actorId: string, pagina: number, limite: number,
  ) => Promise<ResumenCarga[]>) {}

  async ejecutar(actor: EjecutorAccion, pagina: number, limite: number) {
    const general = actor.alcanceAdministrador === AlcanceAdministrador.General;
    if (actor.rol !== RolUsuario.Administrador || (!general && !actor.sedeId)) {
      throw new ErrorAccesoDenegado('No puedes consultar cargas masivas.');
    }
    const filas = await this.listar(general ? null : actor.sedeId!, actor.id, pagina, limite + 1);
    return { cargas: filas.slice(0, limite), pagina, hayMas: filas.length > limite };
  }
}
