import type { Pool } from 'pg';
import { MiddlewareAutenticacion, RolUsuario } from '../usuarios';
import { ConsultarResultadoUseCase, type NombresCursos } from './aplicacion/consultar-resultado.use-case';
import type { ExamenesFinalizadosPort } from './dominio/fuentes-resultado.port';
import type { Resultado } from './dominio/resultado';
import { PostgresResultadoRepository } from './infraestructura/postgres-resultado-repository';
import { crearRutasResultados } from './presentacion/resultado.routes';

export interface ConsultaResultadosInterna {
  porSimulacro(id: string, despues?: string): Promise<Resultado[]>;
  porPostulante(id: string, despues?: string): Promise<Resultado[]>;
  contarCalificados(ids: string[]): Promise<number>;
  totalesPorSimulacro(): Promise<{ id: string; total: number }[]>;
}

export class ResultadosModule {
  readonly rutas;
  readonly consultas: ConsultaResultadosInterna;
  readonly resultadosParaAnalitica: (simulacroId: string | undefined, despues?: string) => Promise<Resultado[]>;

  constructor(pool: Pool, examenes: ExamenesFinalizadosPort, auth: MiddlewareAutenticacion, nombresCursos: NombresCursos) {
    const repo = new PostgresResultadoRepository(pool);
    this.resultadosParaAnalitica = (simulacroId, despues) => repo.listarParaAnalitica(simulacroId, despues);
    this.rutas = crearRutasResultados(new ConsultarResultadoUseCase(id => repo.buscar(id), examenes, nombresCursos),
      auth.autenticar, auth.requerirRol(RolUsuario.Postulante));
    this.consultas = {
      porSimulacro: (id, despues) => repo.listar('simulacro_id', id, despues),
      porPostulante: (id, despues) => repo.listar('postulante_id', id, despues),
      contarCalificados: ids => repo.contarCalificados(ids),
      totalesPorSimulacro: () => repo.totalesPorSimulacro(),
    };
  }
}
