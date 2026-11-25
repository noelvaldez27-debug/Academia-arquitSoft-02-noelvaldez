import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { MiddlewareAutenticacion } from '../usuarios';
import { GestionarPreguntasUseCase } from './aplicacion/gestionar-preguntas.use-case';
import { PostgresPreguntaRepository } from './infraestructura/postgres-pregunta-repository';
import { PostgresSeparataRepository } from './infraestructura/postgres-separata-repository';
import { RepositoriosBanco } from './infraestructura/repositorios-banco';
import { crearRutasPreguntas } from './presentacion/pregunta.routes';

export class BancoPreguntasModule {
  readonly rutas;
  private readonly repositorios: RepositoriosBanco;

  constructor(pool: Pool, auth: MiddlewareAutenticacion) {
    this.repositorios = {
      preguntas: new PostgresPreguntaRepository(pool),
      separatas: new PostgresSeparataRepository(pool),
    };
    this.rutas = crearRutasPreguntas(new GestionarPreguntasUseCase(this.repositorios.preguntas, randomUUID), auth);
  }
}
