import { PostgresVersionSimulacro } from './infraestructura/postgres-version-simulacro';
import { ConsultaClavesSimulacro, ConsultaSimulacros, GestionarSimulacrosUseCase } from './aplicacion/gestionar-simulacros.use-case';
import { crearRutasSimulacros } from './presentacion/simulacro.routes';
import { RevisarSeparataUseCase } from './aplicacion/revisar-separata.use-case';
import { crearRutasRevision } from './presentacion/revision.routes';
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
  readonly simulacros: ConsultaSimulacros;
  readonly clavesSimulacro: ConsultaClavesSimulacro;
  private readonly repositorios: RepositoriosBanco;

  constructor(pool: Pool, auth: MiddlewareAutenticacion, almacen: AlmacenArchivos, maxBytes: number) {
    this.repositorios = {
      preguntas: new PostgresPreguntaRepository(pool),
      separatas: new PostgresSeparataRepository(pool),
    };
    const { preguntas, separatas } = this.repositorios;
    this.rutas = crearRutasPreguntas(new GestionarPreguntasUseCase(preguntas, randomUUID), auth);
    const gestionarSimulacros = new GestionarSimulacrosUseCase(preguntas, randomUUID);
    this.simulacros = { consultar: id => gestionarSimulacros.consultar(id) };
    const versiones = new PostgresVersionSimulacro(pool);
    this.clavesSimulacro = { clave: async id => await versiones.clave(id) ?? gestionarSimulacros.clave(id) };
    this.rutas.use(crearRutasSimulacros(gestionarSimulacros));
    this.rutas.use(crearRutasRevision(new RevisarSeparataUseCase(separatas, () => new Date(), almacen)));
    this.rutas.use(crearRutasSeparata(new SubirSeparataUseCase(preguntas, separatas, almacen, randomUUID, maxBytes), maxBytes));
  }

  consultasVersionadas(transaccion: Pick<Pool, 'query'>): ConsultaSimulacros {
    const versiones = new PostgresVersionSimulacro(transaccion);
    return { consultar: id => versiones.congelar(id) };
  }
}
