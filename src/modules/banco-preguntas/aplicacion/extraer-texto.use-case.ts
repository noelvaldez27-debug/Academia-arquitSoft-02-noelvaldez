import { AdjuntoLecturaIA, ServicioIA } from '../../../compartido/aplicacion/servicio-ia';
import { ErrorBancoPreguntas } from '../dominio/errores';
import { AutorizacionExterna, Separata, permiteTransferencia } from '../dominio/separata';
import { ExtractorDeTextoPort } from './extractor-de-texto.port';

export class ExtraerTextoUseCase {
  constructor(
    private readonly extractores: Readonly<Record<string, ExtractorDeTextoPort>>,
    private readonly servicio: Pick<ServicioIA, 'leerAdjunto'>,
  ) {}

  async ejecutar(separata: Separata, contenido: Buffer, consultarAutorizacion: () => Promise<AutorizacionExterna | null>) {
    const extractor = this.extractores[separata.mime];
    const local = extractor ? (await extractor.extraer(contenido)).trim() : '';
    if (local) return local;
    const mime = separata.mime;
    if (mime !== 'image/jpeg' && mime !== 'image/png' && mime !== 'application/pdf') {
      throw new ErrorBancoPreguntas('validacion', 'El documento no contiene texto extraíble.');
    }
    if (!permiteTransferencia(separata.id, await consultarAutorizacion(), 'adjunto')) return null;
    const adjunto: AdjuntoLecturaIA = { mime, contenido };
    const resultado = (await this.servicio.leerAdjunto(adjunto)).trim();
    if (!resultado) throw new ErrorBancoPreguntas('validacion', 'No se encontró contenido académico extraíble.');
    return resultado;
  }
}
