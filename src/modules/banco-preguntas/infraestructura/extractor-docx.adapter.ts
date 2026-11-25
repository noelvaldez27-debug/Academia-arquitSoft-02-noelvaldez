import mammoth from 'mammoth';
import { ExtractorDeTextoPort } from '../aplicacion/extractor-de-texto.port';

export class ExtractorDocxAdapter implements ExtractorDeTextoPort {
  async extraer(buffer: Buffer): Promise<string> {
    return (await mammoth.extractRawText({ buffer })).value.trim();
  }
}
