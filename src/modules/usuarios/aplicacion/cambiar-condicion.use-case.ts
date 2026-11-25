import { AlcanceAdministrador, RolUsuario } from '../dominio';
import { CondicionPostulante, esCondicionPostulante } from '../dominio/usuario';
import { EjecutorAccion } from './registrar-estudiante.command';

export class CambiarCondicionUseCase {
  constructor(private readonly guardar: (id: string, condicion: CondicionPostulante, sedeId: string | null) => Promise<boolean>) {}

  async ejecutar(actor: EjecutorAccion | undefined, id: string, condicion: unknown) {
    if (actor?.rol !== RolUsuario.Administrador) return 403;
    const general = actor.alcanceAdministrador === AlcanceAdministrador.General;
    if (!general && (actor.alcanceAdministrador !== AlcanceAdministrador.Sede || !actor.sedeId)) return 403;
    const sedeId = general ? null : actor.sedeId!;
    if (!esCondicionPostulante(condicion) || !/^[1-9]\d{0,9}$/.test(id) || Number(id) > 2147483647) return 400;
    return await this.guardar(id, condicion, sedeId) ? 204 : 404;
  }
}
