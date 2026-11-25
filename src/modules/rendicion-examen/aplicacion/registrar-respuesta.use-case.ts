import { ErrorRendicion } from '../dominio/error-rendicion';
import { validarMarca } from '../dominio/examen';
import { consultarPropio } from './iniciar-examen.use-case';
import { RegistrarRespuestaCommand } from './registrar-respuesta.command';
import { Reloj } from './reloj.port';
import { RespuestasTemporales } from './respuestas-temporales.port';
import { TransaccionExamen } from './transaccion-examen.port';

export class RegistrarRespuestaUseCase {
  constructor(
    private readonly transaccion: TransaccionExamen,
    private readonly temporales: RespuestasTemporales,
    private readonly reloj: Reloj,
  ) {}

  ejecutar(id: string, postulanteId: string, comando: RegistrarRespuestaCommand) {
    return consultarPropio(this.transaccion, id, postulanteId, async (examen, simulacro) => {
      examen.verificarVigencia(this.reloj());
      if (!comando || !Number.isSafeInteger(comando.revisionBase) || comando.revisionBase < 0 ||
          typeof comando.operacionId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(comando.operacionId)) {
        throw new ErrorRendicion('invalido', 'Revisión base o identificador de operación inválidos.');
      }
      const { numero, alternativa, revisionBase, operacionId } = comando;
      validarMarca(simulacro, numero, alternativa);
      return this.temporales.registrar(examen.id, examen.vence, { numero, alternativa, revisionBase, operacionId });
    });
  }
}
