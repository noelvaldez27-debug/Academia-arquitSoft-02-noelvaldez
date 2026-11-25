import { Examen, SimulacroVisible } from '../dominio/examen';
import { ErrorRendicion } from '../dominio/error-rendicion';
import { TransaccionExamen } from './transaccion-examen.port';
import { Reloj } from './reloj.port';

export class IniciarExamenUseCase {
  constructor(
    private readonly transaccion: TransaccionExamen,
    private readonly reloj: Reloj,
    private readonly generarId: () => string,
    private readonly inicializarRespuestas: (id: string) => Promise<void>,
  ) {}

  ejecutar(postulanteId: string, simulacroId: string) {
    return this.transaccion(async ({ examenes, consultarSimulacro }) => {
      const existente = await examenes.buscarIntento(postulanteId, simulacroId);
      existente?.verificarVigencia(this.reloj());
      const simulacro = await consultarSimulacro(simulacroId);
      if (existente) return { examen: existente, simulacro };

      const inicio = this.reloj();
      const candidato = new Examen(this.generarId(), postulanteId, simulacroId, inicio,
        new Date(inicio.getTime() + simulacro.duracionMinutos * 60_000));
      const examen = await examenes.insertar(candidato);
      examen.verificarVigencia(this.reloj());
      if (examen.id === candidato.id) await this.inicializarRespuestas(examen.id);
      return { examen, simulacro };
    });
  }
}

export async function consultarPropio(
  transaccion: TransaccionExamen, id: string, postulanteId: string,
  proyectar: (examen: Examen, simulacro: SimulacroVisible) => Promise<unknown>,
) {
  return transaccion(async ({ examenes, consultarSimulacro }) => {
    const examen = await examenes.buscar(id);
    if (!examen) throw new ErrorRendicion('no-encontrado', 'Examen no encontrado.');
    examen.verificarPropietario(postulanteId);
    return proyectar(examen, await consultarSimulacro(examen.simulacroId));
  });
}
