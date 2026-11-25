import { IntentoParaReportes } from '../dominio/examen';

export class CompletarCierreSimulacro {
  constructor(
    private readonly listar: (id: string, despues?: string) => Promise<IntentoParaReportes[]>,
    private readonly contarCalificados: (ids: string[]) => Promise<number>,
    private readonly cerrar: (id: string) => Promise<void>,
  ) {}

  async ejecutar(id: string): Promise<boolean> {
    let despues: string | undefined;
    for (;;) {
      const intentos = await this.listar(id, despues);
      if (intentos.length === 0) break;
      if (intentos.some(intento => intento.cierre === null)
        || await this.contarCalificados(intentos.map(intento => intento.id)) !== intentos.length) return false;
      despues = intentos.at(-1)!.id;
    }
    await this.cerrar(id);
    return true;
  }
}
