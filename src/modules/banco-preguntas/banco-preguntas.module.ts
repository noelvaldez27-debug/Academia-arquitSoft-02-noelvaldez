import { AlmacenArchivos } from '../../compartido/aplicacion/almacen-archivos';
import { SubirSeparataUseCase } from './aplicacion/subir-separata.use-case';
import { crearRutasSeparata } from './presentacion/separata.routes';
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

  constructor(pool: Pool, auth: MiddlewareAutenticacion, almacen: AlmacenArchivos, maxBytes: number) {
    this.repositorios = {
      preguntas: new PostgresPreguntaRepository(pool),
      separatas: new PostgresSeparataRepository(pool),
    };
    const { preguntas, separatas } = this.repositorios;
    this.rutas = crearRutasPreguntas(new GestionarPreguntasUseCase(preguntas, randomUUID), auth);
    this.rutas.use(crearRutasSeparata(new SubirSeparataUseCase(preguntas, separatas, almacen, randomUUID, maxBytes), maxBytes));
  }
}
