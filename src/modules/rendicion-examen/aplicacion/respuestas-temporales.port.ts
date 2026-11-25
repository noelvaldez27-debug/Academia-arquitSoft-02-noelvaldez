import { Respuesta } from '../dominio/respuesta';
import { RegistrarRespuestaCommand } from './registrar-respuesta.command';

export interface RespuestasTemporales {
  inicializar(id: string): Promise<void>;
  listar(id: string): Promise<Respuesta[]>;
  registrar(id: string, vence: Date, comando: RegistrarRespuestaCommand): Promise<Respuesta>;
}
