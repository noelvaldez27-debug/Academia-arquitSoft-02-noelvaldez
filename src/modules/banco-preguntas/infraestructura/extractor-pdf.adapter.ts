import { PDFParse } from 'pdf-parse';
import { ExtractorDeTextoPort } from '../aplicacion/extractor-de-texto.port';

export class ExtractorPdfAdapter implements ExtractorDeTextoPort {
  async extraer(contenido: Buffer): Promise<string> {
    const parser = new PDFParse({ data: new Uint8Array(contenido), isEvalSupported: false });
    try {
      const resultado = await parser.getText();
      return resultado.pages.map(pagina => pagina.text.trim()).filter(Boolean).join('\n\n');
    } finally {
      await parser.destroy();
    }
  }
}
