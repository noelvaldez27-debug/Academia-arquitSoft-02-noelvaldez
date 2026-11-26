import { Request, RequestHandler } from 'express';
import { ConsultarExamenUseCase } from '../aplicacion/consultar-examen.use-case';
import { FinalizarExamenUseCase } from '../aplicacion/finalizar-examen.use-case';
import { IniciarExamenUseCase } from '../aplicacion/iniciar-examen.use-case';
import { RegistrarRespuestaUseCase } from '../aplicacion/registrar-respuesta.use-case';
import { ErrorRendicion } from '../dominio/error-rendicion';

import type { ListarSimulacrosUseCase } from '../aplicacion/listar-simulacros.use-case';

const estados = { invalido: 400, 'no-encontrado': 404, conflicto: 409, vencido: 409 };

function responder(ejecutar: (req: Request, postulanteId: string) => Promise<unknown>): RequestHandler {
  return async (req, res) => {
    try {
      res.json(await ejecutar(req, req.usuario!.id));
    } catch (error) {
      if (error instanceof ErrorRendicion) {
        res.status(estados[error.codigo]).json({ codigo: error.codigo, error: error.message });
      } else {
        console.error('Fallo de infraestructura en Rendición.', error instanceof Error ? error.name : 'Error');
        res.status(503).json({ error: 'Rendición no está disponible temporalmente.' });
      }
    }
  };
}

function idExamen(req: Request): string {
  return String(req.params.id);
}

export class ExamenController {
  constructor(
    private readonly iniciarExamen: IniciarExamenUseCase,
    private readonly consultarExamen: ConsultarExamenUseCase,
    private readonly registrarRespuesta: RegistrarRespuestaUseCase,
    private readonly finalizarExamen: FinalizarExamenUseCase,
    private readonly listarSimulacros?: ListarSimulacrosUseCase,
  ) {}

  listar = responder(async (_req, postulanteId) => this.listarSimulacros?.ejecutar(postulanteId) ?? []);

  iniciar = responder(async (req, postulanteId) => {
    const id: unknown = req.body?.simulacroId;
    if (typeof id !== 'string' || !id.trim()) throw new ErrorRendicion('invalido', 'Indica el simulacro.');
    const { examen } = await this.iniciarExamen.ejecutar(postulanteId, id.trim());
    return this.consultarExamen.ejecutar(examen.id, postulanteId);
  });

  consultar = responder((req, postulanteId) => this.consultarExamen.ejecutar(idExamen(req), postulanteId));

  registrar = responder((req, postulanteId) => this.registrarRespuesta.ejecutar(idExamen(req), postulanteId, req.body));

  finalizar = responder((req, postulanteId) => this.finalizarExamen.ejecutar(idExamen(req), postulanteId));
}
