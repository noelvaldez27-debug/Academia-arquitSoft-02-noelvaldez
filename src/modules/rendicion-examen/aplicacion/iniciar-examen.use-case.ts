import { ExamenRepository } from '../dominio/examen-repository';
import { DatosInicialesPostulante, Examen, SimulacroVisible } from '../dominio/examen';
import { ErrorRendicion } from '../dominio/error-rendicion';
import { TransaccionExamen } from './transaccion-examen.port';
import { Reloj } from './reloj.port';

export class IniciarExamenUseCase {
  constructor(
    private readonly transaccion: TransaccionExamen,
    private readonly reloj: Reloj,
    private readonly generarId: () => string,
    private readonly inicializarRespuestas: (id: string) => Promise<void>,
    private readonly consultarDatos?: (id: string) => Promise<DatosInicialesPostulante>,
  ) {}

  ejecutar(postulanteId: string, simulacroId: string) {
    return this.transaccion(async ({ examenes, consultarSimulacro, coordinarInicio, consultarPostulanteHabilitado, verificarPadron }) => {
      const admision = await consultarPostulanteHabilitado?.(postulanteId);
      if (consultarPostulanteHabilitado && !admision) {
        throw new ErrorRendicion('conflicto', 'La cuenta no puede iniciar un intento.');
      }
      const enCierre = await coordinarInicio?.(simulacroId);
      const existente = await examenes.buscarIntento(postulanteId, simulacroId);
      existente?.verificarVigencia(this.reloj());
      if (!existente && enCierre) throw new ErrorRendicion('conflicto', 'El simulacro no admite nuevos intentos.');
      if (existente) return { examen: existente, simulacro: await consultarSimulacro(simulacroId) };
      const historico = await verificarPadron?.(simulacroId, postulanteId);
      const simulacro = await consultarSimulacro(simulacroId);

      const datosIniciales = historico ?? admision ?? await this.consultarDatos?.(postulanteId) ?? null;
      const inicio = this.reloj();
      const candidato = new Examen(this.generarId(), postulanteId, simulacroId, inicio,
        new Date(inicio.getTime() + simulacro.duracionMinutos * 60_000), null, datosIniciales);
      const examen = await examenes.insertar(candidato);
      examen.verificarVigencia(this.reloj());
      if (examen.id === candidato.id) await this.inicializarRespuestas(examen.id);
      return { examen, simulacro };
    });
  }
}

export async function consultarPropio<T>(
  transaccion: TransaccionExamen, id: string, postulanteId: string,
  proyectar: (examen: Examen, simulacro: SimulacroVisible, examenes: ExamenRepository) => Promise<T>,
) {
  return transaccion(async ({ examenes, consultarSimulacro }) => {
    const examen = await examenes.buscar(id);
    if (!examen) throw new ErrorRendicion('no-encontrado', 'Examen no encontrado.');
    examen.verificarPropietario(postulanteId);
    return proyectar(examen, await consultarSimulacro(examen.simulacroId), examenes);
  });
}
