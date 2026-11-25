import { PreguntaRepository } from '../dominio/pregunta-repository';
import { SeparataRepository } from '../dominio/separata-repository';

export interface RepositoriosBanco {
  preguntas: PreguntaRepository;
  separatas: SeparataRepository;
}
