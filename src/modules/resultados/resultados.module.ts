import type { Pool } from 'pg';
import { MiddlewareAutenticacion, RolUsuario } from '../usuarios';
import { ConsultarResultadoUseCase } from './aplicacion/consultar-resultado.use-case';
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

  constructor(pool: Pool, examenes: ExamenesFinalizadosPort, auth: MiddlewareAutenticacion) {
    const repo = new PostgresResultadoRepository(pool);
    this.rutas = crearRutasResultados(new ConsultarResultadoUseCase(id => repo.buscar(id), examenes),
      auth.autenticar, auth.requerirRol(RolUsuario.Postulante));
    this.consultas = {
      porSimulacro: (id, despues) => repo.listar('simulacro_id', id, despues),
      porPostulante: (id, despues) => repo.listar('postulante_id', id, despues),
      contarCalificados: ids => repo.contarCalificados(ids),
      totalesPorSimulacro: () => repo.totalesPorSimulacro(),
    };
  }
}
