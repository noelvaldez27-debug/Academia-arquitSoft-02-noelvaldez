import { AlmacenArchivos } from '../../../compartido/aplicacion/almacen-archivos';
import { ErrorBancoPreguntas } from '../dominio/errores';
import { PreguntaRepository } from '../dominio/pregunta-repository';
import { Separata } from '../dominio/separata';
import { SeparataRepository } from '../dominio/separata-repository';
import { ActorBanco } from './actor-banco';

function identificar(formato: string, bytes: Buffer): string | null {
  switch (formato) {
    case 'pdf': return bytes.subarray(0, 5).toString() === '%PDF-' ? 'application/pdf' : null;
    case 'png': return bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ? 'image/png' : null;
    case 'jpg':
    case 'jpeg': return bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')) ? 'image/jpeg' : null;
    case 'docx':
      return bytes.subarray(0, 4).equals(Buffer.from('504b0304', 'hex')) &&
        bytes.includes('[Content_Types].xml') && bytes.includes('word/document.xml')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : null;
    default: return null;
  }
}

export class SubirSeparataUseCase {
  constructor(
    private readonly preguntas: Pick<PreguntaRepository, 'curso'>,
    private readonly separatas: SeparataRepository,
    private readonly almacen: AlmacenArchivos,
    private readonly generarId: () => string,
    private readonly maxBytes: number,
  ) {}

  async ejecutar(actor: ActorBanco, cursoId: string, nombre: string, contenido: Buffer) {
    if (actor.permiso !== 'docente') throw new ErrorBancoPreguntas('acceso', 'Se requiere un docente.');
    if (!contenido.length || contenido.length > this.maxBytes) {
      throw new ErrorBancoPreguntas('validacion', 'La separata está vacía o supera el tamaño máximo permitido.');
    }
    const extension = /\.([a-z0-9]+)$/i.exec(nombre)?.[1].toLowerCase() ?? '';
    const mime = identificar(extension, contenido);
    if (!mime) throw new ErrorBancoPreguntas('validacion', 'Adjunta un archivo DOCX, PDF, JPG, JPEG o PNG válido.');
    if (!await this.preguntas.curso(cursoId)) {
      throw new ErrorBancoPreguntas('no-encontrado', 'Curso no encontrado.');
    }
    const id = this.generarId();
    const archivo = 'separatas/' + id + '.' + extension;
    await this.almacen.guardar(archivo, contenido);
    const separata: Separata = { id, docenteId: actor.id, cursoId, archivo, mime, estado: 'SUBIDA', motivo: null, texto: null };
    await this.separatas.guardar(separata, true);
    return { id, estado: separata.estado };
  }
}
