import { CalificacionRanking, IntentoRanking, ProyeccionRanking, proyectarRanking } from '../dominio/proyeccion-ranking';

interface FuentesRanking {
  cerrado(id: string): Promise<boolean>;
  intentos(id: string, despues?: string): Promise<IntentoRanking[]>;
  calificaciones(id: string, despues?: string): Promise<CalificacionRanking[]>;
}

export interface PersistenciaRanking {
  reemplazar(id: string, construir: () => Promise<ProyeccionRanking>): Promise<void>;
  consultar(id: string): Promise<ProyeccionRanking | null>;
}

export class ActualizarRankingUseCase {
  constructor(private readonly fuentes: FuentesRanking, private readonly repositorio: PersistenciaRanking) {}

  async ejecutar(id: string): Promise<void> {
    await this.repositorio.reemplazar(id, async () => {
      const cerrado = await this.fuentes.cerrado(id);
      const intentos = await paginar(despues => this.fuentes.intentos(id, despues), fila => fila.id);
      const resultados = await paginar(despues => this.fuentes.calificaciones(id, despues), fila => fila.examenId);
      return proyectarRanking(intentos, resultados, cerrado);
    });
  }
}

async function paginar<T>(
  consultar: (despues?: string) => Promise<T[]>, identificar: (fila: T) => string,
): Promise<T[]> {
  const filas: T[] = [];
  let despues: string | undefined;
  for (;;) {
    const pagina = await consultar(despues);
    if (pagina.length === 0) return filas;
    filas.push(...pagina);
    despues = identificar(pagina.at(-1)!);
  }
}
