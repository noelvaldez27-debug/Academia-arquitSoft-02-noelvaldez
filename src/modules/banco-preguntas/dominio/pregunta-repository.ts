import { ConfiguracionSimulacro, Curso, Pregunta } from './pregunta';

export interface PreguntaRepository {
  curso(id: string): Promise<Curso | null>;
  guardarCurso(curso: Curso): Promise<void>;
  buscar(id: string): Promise<Pregunta | null>;
  listar(cursoId: string): Promise<Pregunta[]>;
  guardar(pregunta: Pregunta): Promise<void>;
  guardarSimulacro(configuracion: ConfiguracionSimulacro): Promise<void>;
  buscarSimulacro(id: string): Promise<ConfiguracionSimulacro | null>;
}
