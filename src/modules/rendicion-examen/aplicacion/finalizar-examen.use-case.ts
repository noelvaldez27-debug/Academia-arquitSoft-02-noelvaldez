import { ErrorRendicion } from '../dominio/error-rendicion';
import { Reloj } from './reloj.port';
import { RespuestasTemporales } from './respuestas-temporales.port';
import { TransaccionExamen } from './transaccion-examen.port';

export class FinalizarExamenUseCase {
  constructor(
    private readonly transaccion: TransaccionExamen,
    private readonly temporales: RespuestasTemporales,
    private readonly reloj: Reloj,
  ) {}

  ejecutar(id: string, postulanteId: string) {
    return this.cerrar(id, postulanteId);
  }

  expirar(id: string) {
    return this.cerrar(id);
  }

  private cerrar(id: string, postulanteId?: string) {
    return this.transaccion(async ({ examenes }) => {
      const examen = await examenes.buscar(id);
      if (!examen) throw new ErrorRendicion('no-encontrado', 'Examen no encontrado.');
      if (postulanteId !== undefined) examen.verificarPropietario(postulanteId);
      if (examen.cierre) return this.resumen(id, examen.cierre);
      const ahora = this.reloj();
      if (postulanteId === undefined && examen.tiempoRestante(ahora) > 0) return null;
      const datos = await this.temporales.sellar(id, examen.finalizar(ahora).cierre!);
      await examenes.consolidar(examen.finalizar(datos.cierre), datos.respuestas);
      return this.resumen(id, datos.cierre);
    });
  }

  private resumen(id: string, cierre: Date) {
    return { id, cierre, estado: 'FINALIZADO' };
  }
}
