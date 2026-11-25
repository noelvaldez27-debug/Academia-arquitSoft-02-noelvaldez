import { AlmacenArchivos } from '../../../compartido/aplicacion/almacen-archivos';
import { ServicioIA } from '../../../compartido/aplicacion/servicio-ia';
import { ErrorBancoPreguntas } from '../dominio/errores';
import { CLAVES_ALTERNATIVAS, validarContenidoPregunta } from '../dominio/pregunta';
import { PreguntaPropuesta } from '../dominio/pregunta-propuesta';
import { PreguntaRepository } from '../dominio/pregunta-repository';
import { permiteTransferencia } from '../dominio/separata';
import { SeparataRepository } from '../dominio/separata-repository';
import { ExtraerTextoUseCase } from './extraer-texto.use-case';

export class ProcesarSeparataUseCase {
  constructor(
    private readonly separatas: SeparataRepository,
    private readonly preguntas: Pick<PreguntaRepository, 'curso'>,
    private readonly archivos: AlmacenArchivos,
    private readonly extraer: ExtraerTextoUseCase,
    private readonly ia: Pick<ServicioIA, 'proponer'>,
    private readonly generarId: () => string,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const separata = await this.separatas.buscar(id);
    if (!separata || separata.estado === 'PREGUNTAS_PROPUESTAS' || separata.estado === 'ERROR_EXTRACCION') return;

    if (separata.texto === null) {
      await this.separatas.guardar({ ...separata, estado: 'EN_EXTRACCION', motivo: null });
      const contenido = await this.archivos.obtener(separata.archivo);
      const texto = await this.extraer.ejecutar(separata, contenido, () => this.separatas.autorizacion(id));
      if (texto === null) {
        await this.separatas.guardar({ ...separata, estado: 'SUBIDA', motivo: 'Pendiente de autorización para lectura del adjunto.' });
        return;
      }
      separata.texto = texto;
      separata.estado = 'TEXTO_EXTRAIDO';
      await this.separatas.guardar({ ...separata, motivo: null });
    }

    if (!permiteTransferencia(id, await this.separatas.autorizacion(id), 'texto')) {
      await this.separatas.guardar({ ...separata, motivo: 'Pendiente de autorización para generar propuestas.' });
      return;
    }
    const curso = await this.preguntas.curso(separata.cursoId);
    if (!curso) throw new ErrorBancoPreguntas('no-encontrado', 'Curso no encontrado.');
    const generadas = await this.ia.proponer(separata.texto, curso.nombre);
    const propuestas: PreguntaPropuesta[] = generadas.map(generada => {
      const alternativas = generada?.alternativas;
      if (!Array.isArray(alternativas) || alternativas.length !== 5 ||
          alternativas.some(alternativa => typeof alternativa?.esCorrecta !== 'boolean') ||
          alternativas.filter(alternativa => alternativa.esCorrecta).length !== 1) {
        throw new ErrorBancoPreguntas('validacion', 'La propuesta generada no tiene una única respuesta correcta.');
      }
      const contenido = validarContenidoPregunta({
        enunciado: generada.enunciado,
        alternativas: { A: alternativas[0].texto, B: alternativas[1].texto, C: alternativas[2].texto,
          D: alternativas[3].texto, E: alternativas[4].texto },
        correcta: CLAVES_ALTERNATIVAS[alternativas.findIndex(alternativa => alternativa.esCorrecta)],
      });
      return { ...contenido, id: this.generarId(), separataId: id, estado: 'PROPUESTA' };
    });
    await this.separatas.guardarPropuestas(separata, propuestas);
  }

  async registrarFallo(id: string): Promise<void> {
    const separata = await this.separatas.buscar(id);
    if (separata && separata.estado !== 'PREGUNTAS_PROPUESTAS') {
      const motivo = separata.texto === null
        ? 'No se pudo extraer el texto de la separata.'
        : 'No se pudo generar o validar las propuestas de la separata.';
      await this.separatas.guardar({ ...separata, estado: 'ERROR_EXTRACCION', motivo });
    }
  }
}
