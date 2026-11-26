export interface OpcionRendicion {
  simulacroId: string;
  intentoId: string | null;
  cicloId: string | null;
  habilitadoEn: Date | null;
  cierre: Date | null;
}

export class ListarSimulacrosUseCase {
  constructor(
    private readonly opciones: (postulanteId: string) => Promise<OpcionRendicion[]>,
    private readonly sigueVinculado: (cicloId: string, postulanteId: string) => Promise<boolean>,
  ) {}

  async ejecutar(postulanteId: string) {
    const entradas = await this.opciones(postulanteId);
    const ciclos = new Map<string, Promise<boolean>>();
    const autorizadas = await Promise.all(entradas.map(async entrada => {
      if (entrada.intentoId) return entrada;
      if (!entrada.cicloId) return null;
      const permiso = ciclos.get(entrada.cicloId) ?? this.sigueVinculado(entrada.cicloId, postulanteId);
      ciclos.set(entrada.cicloId, permiso);
      return await permiso ? entrada : null;
    }));
    return autorizadas.flatMap(entrada => entrada ? [{
      simulacroId: entrada.simulacroId, intentoId: entrada.intentoId,
      habilitadoEn: entrada.habilitadoEn,
      estado: entrada.cierre ? 'FINALIZADO' : entrada.intentoId ? 'EN_CURSO' : 'DISPONIBLE',
    }] : []);
  }
}
