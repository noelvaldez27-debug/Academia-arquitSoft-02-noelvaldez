import {
  ServicioIA,
  AdjuntoLecturaIA,
  PreguntaPropuesta,
} from '../aplicacion/servicio-ia';

/**
 * Adaptador simulado determinista para el servicio de inteligencia artificial.
 * Permite ejecutar pruebas unitarias, de integración y de carga sin consumir la cuota de IA.
 * Referencia: ADR-010, RC14.
 */
export class ServicioIASimulado implements ServicioIA {
  private respuestasProponerPersonalizadas?: PreguntaPropuesta[];
  private respuestaRecomendarPersonalizada?: string;

  constructor(opciones?: {
    respuestasProponer?: PreguntaPropuesta[];
    respuestaRecomendar?: string;
  }) {
    if (opciones?.respuestasProponer) {
      this.respuestasProponerPersonalizadas = opciones.respuestasProponer;
    }
    if (opciones?.respuestaRecomendar) {
      this.respuestaRecomendarPersonalizada = opciones.respuestaRecomendar;
    }
  }

  async leerAdjunto(_adjunto: AdjuntoLecturaIA): Promise<string> {
    return 'Contenido académico sintético para la lectura de adjuntos.';
  }

  async proponer(texto: string, curso: string): Promise<PreguntaPropuesta[]> {
    if (this.respuestasProponerPersonalizadas) {
      return this.respuestasProponerPersonalizadas;
    }

    const fragmento = texto.trim().substring(0, 30);

    return [
      {
        enunciado: `¿Pregunta simulada sobre ${curso} basada en: "${fragmento}"?`,
        alternativas: [
          { texto: `Alternativa correcta de ${curso}`, esCorrecta: true },
          { texto: `Distractor A de ${curso}`, esCorrecta: false },
          { texto: `Distractor B de ${curso}`, esCorrecta: false },
          { texto: `Distractor C de ${curso}`, esCorrecta: false },
          { texto: `Distractor D de ${curso}`, esCorrecta: false },
        ],
        explicacion: `Explicación técnica simulada para la pregunta de ${curso}.`,
      },
    ];
  }

  async recomendar(cursosDebiles: string[]): Promise<string> {
    if (this.respuestaRecomendarPersonalizada !== undefined) {
      return this.respuestaRecomendarPersonalizada;
    }

    if (!cursosDebiles || cursosDebiles.length === 0) {
      return 'Felicitaciones, mantienes un rendimiento sólido en todos los cursos.';
    }

    const lista = cursosDebiles.join(', ');
    return `Recomendación de refuerzo simulada: enfocar el estudio en los temas clave de ${lista}.`;
  }
}
