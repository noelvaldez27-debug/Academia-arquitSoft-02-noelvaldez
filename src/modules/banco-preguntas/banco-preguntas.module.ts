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
import { MiddlewareAutenticacion, RolUsuario, ServicioConsultaUsuarios } from '../usuarios';
import { GestionarAsignacionesUseCase } from './aplicacion/gestionar-asignaciones.use-case';
import { PostgresAsignacionesDocentes } from './infraestructura/postgres-asignaciones-docentes';
import { crearRutasAsignaciones } from './presentacion/asignaciones.routes';
import { GestionarPreguntasUseCase } from './aplicacion/gestionar-preguntas.use-case';
import { PostgresPreguntaRepository } from './infraestructura/postgres-pregunta-repository';
import { PostgresSeparataRepository } from './infraestructura/postgres-separata-repository';
import { RepositoriosBanco } from './infraestructura/repositorios-banco';
import { crearRutasPreguntas } from './presentacion/pregunta.routes';
import { GestionarTemasUseCase } from './aplicacion/gestionar-temas.use-case';
import { PostgresTemaRepository } from './infraestructura/postgres-tema-repository';
import { crearRutasTemas } from './presentacion/tema.routes';

import type { CacheConsultas } from '../../compartido/aplicacion/cache-consultas.port';
import { consultarVersionVisible } from './infraestructura/cache-version-visible';

export class BancoPreguntasModule {
  readonly rutas;
  readonly simulacros: ConsultaSimulacros;
  readonly clavesSimulacro: ConsultaClavesSimulacro;
  readonly cursosAsignados: (docenteId: string) => Promise<string[]>;
  readonly existeSimulacro: (id: string) => Promise<boolean>;
  private readonly repositorios: RepositoriosBanco;

  constructor(pool: Pool, auth: MiddlewareAutenticacion, almacen: AlmacenArchivos, maxBytes: number,
    usuarios?: ServicioConsultaUsuarios, private readonly cacheConsultas?: CacheConsultas) {
    this.repositorios = {
      preguntas: new PostgresPreguntaRepository(pool),
      separatas: new PostgresSeparataRepository(pool),
    };
    const { preguntas, separatas } = this.repositorios;
    this.existeSimulacro = async id => Boolean(await preguntas.buscarSimulacro(id));
    this.rutas = crearRutasPreguntas(new GestionarPreguntasUseCase(preguntas, randomUUID), auth);
    const asignaciones = new PostgresAsignacionesDocentes(pool);
    this.cursosAsignados = id => asignaciones.porDocente(id);
    this.rutas.use(crearRutasTemas(new GestionarTemasUseCase(
      new PostgresTemaRepository(pool, this.cacheConsultas), async id => Boolean(await preguntas.curso(id)), this.cursosAsignados, randomUUID,
    )));
    this.rutas.use(crearRutasAsignaciones(new GestionarAsignacionesUseCase(
      async id => {
        const usuario = await usuarios?.consultarPorId(id);
        return usuario?.id === id && usuario.rol === RolUsuario.Docente;
      },
      id => preguntas.curso(id),
      (docente, curso, asignado) => asignaciones.guardar(docente, curso, asignado),
    )));
    const gestionarSimulacros = new GestionarSimulacrosUseCase(preguntas, randomUUID);
    this.simulacros = { consultar: id => gestionarSimulacros.consultar(id) };
    const versiones = new PostgresVersionSimulacro(pool);
    this.clavesSimulacro = { clave: async id => await versiones.clave(id) ?? gestionarSimulacros.clave(id) };
    this.rutas.use(crearRutasSimulacros(gestionarSimulacros));
    this.rutas.use(crearRutasRevision(new RevisarSeparataUseCase(separatas, () => new Date(), almacen)));
    this.rutas.use(crearRutasSeparata(new SubirSeparataUseCase(preguntas, separatas, almacen, randomUUID, maxBytes), maxBytes));
  }

  consultasVersionadas(transaccion: Pick<Pool, 'query'>,
    despuesDeConfirmar?: (accion: () => Promise<void>) => void): ConsultaSimulacros {
    const versiones = new PostgresVersionSimulacro(transaccion);
    return { consultar: id => consultarVersionVisible(id, () => versiones.congelar(id), this.cacheConsultas, despuesDeConfirmar) };
  }
}
