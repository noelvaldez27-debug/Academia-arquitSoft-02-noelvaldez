import { AlmacenArchivos } from '../../../compartido/aplicacion/almacen-archivos';
import { ErrorBancoPreguntas } from '../dominio/errores';
import { ContenidoPregunta } from '../dominio/pregunta';
import { corregirPropuesta, resolverPropuesta } from '../dominio/pregunta-propuesta';
import { AlcanceAutorizacion } from '../dominio/separata';
import { SeparataRepository } from '../dominio/separata-repository';
import { ActorBanco } from './actor-banco';
import { requerirGeneral } from './gestionar-preguntas.use-case';

function verificarDocente(actor: ActorBanco, docenteId: string): void {
  if (actor.permiso !== 'docente' || actor.id !== docenteId) {
    throw new ErrorBancoPreguntas('acceso', 'Se requiere el docente responsable de la separata.');
  }
}

function verificarRevision(actor: ActorBanco, docenteId: string): void {
  if (actor.permiso !== 'general') verificarDocente(actor, docenteId);
}

interface SolicitudAutorizacion {
  estado: 'AUTORIZADA' | 'REVOCADA';
  alcance?: AlcanceAutorizacion[];
  contenidoApto?: boolean;
}

export class RevisarSeparataUseCase {
  constructor(private readonly separatas: SeparataRepository, private readonly ahora: () => Date, private readonly archivos?: Pick<AlmacenArchivos, 'obtener'>) {}

  async obtenerOriginal(actor: ActorBanco, id: string) {
    const separata = await this.separatas.buscar(id);
    if (!separata) throw new ErrorBancoPreguntas('no-encontrado', 'Separata no encontrada.');
    verificarRevision(actor, separata.docenteId);
    if (!this.archivos) throw new Error('Almacén no disponible.');
    return { mime: separata.mime, contenido: await this.archivos.obtener(separata.archivo) };
  }

  async consultar(actor: ActorBanco, id: string) {
    const separata = await this.separatas.buscar(id);
    if (!separata) throw new ErrorBancoPreguntas('no-encontrado', 'Separata no encontrada.');
    verificarRevision(actor, separata.docenteId);
    const { estado, motivo, cursoId } = separata;
    return {
      id, estado, motivo, cursoId,
      autorizacion: await this.separatas.autorizacion(id),
      propuestas: await this.separatas.listarPropuestas(id),
    };
  }

  async autorizar(actor: ActorBanco, id: string, solicitud: SolicitudAutorizacion) {
    requerirGeneral(actor);
    if (solicitud?.estado !== 'AUTORIZADA' && solicitud?.estado !== 'REVOCADA') {
      throw new ErrorBancoPreguntas('validacion', 'Indica si se autoriza o revoca la transferencia.');
    }
    const alcance = solicitud.estado === 'REVOCADA' ? [] : solicitud.alcance;
    if (!Array.isArray(alcance) || alcance.some(valor => valor !== 'texto' && valor !== 'adjunto') ||
        (solicitud.estado === 'AUTORIZADA' && (!alcance.length || solicitud.contenidoApto !== true))) {
      throw new ErrorBancoPreguntas('validacion', 'Confirma los permisos del contenido y declara el alcance de transferencia.');
    }
    if (!await this.separatas.buscar(id)) throw new ErrorBancoPreguntas('no-encontrado', 'Separata no encontrada.');
    const autorizacion = { separataId: id, autorizadorId: actor.id, fecha: this.ahora(), estado: solicitud.estado,
      alcance: [...new Set(alcance)] };
    await this.separatas.guardarAutorizacion(autorizacion);
    return autorizacion;
  }

  corregir(actor: ActorBanco, id: string, contenido: ContenidoPregunta) {
    return this.separatas.revisarPropuesta(id, (propuesta, docenteId) => {
      verificarRevision(actor, docenteId);
      return corregirPropuesta(propuesta, contenido);
    });
  }

  aprobar(actor: ActorBanco, id: string) {
    return this.separatas.revisarPropuesta(id, (propuesta, docenteId) => {
      verificarDocente(actor, docenteId);
      return resolverPropuesta(propuesta, 'APROBADA');
    });
  }

  descartar(actor: ActorBanco, id: string) {
    return this.separatas.revisarPropuesta(id, (propuesta, docenteId) => {
      verificarRevision(actor, docenteId);
      return resolverPropuesta(propuesta, 'RECHAZADA');
    });
  }
}
