import { Request, RequestHandler, Response } from 'express';
import { ErrorBancoPreguntas } from '../dominio/errores';

const estados = { validacion: 400, acceso: 403, 'no-encontrado': 404, conflicto: 409 } as const;

export function responder(
  ejecutar: (req: Request, res: Response) => Promise<unknown>, estado = 200,
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const datos = await ejecutar(req, res);
      if (!res.headersSent) res.status(estado).json(datos);
    } catch (error) {
      if (error instanceof ErrorBancoPreguntas) {
        res.status(estados[error.tipo]).json({ error: error.message });
      } else if ((error as { constraint?: string })?.constraint === 'tema_banco_disponible') {
        res.status(400).json({ error: 'El tema debe estar activo y pertenecer al curso de la pregunta.' });
      } else {
        res.status(500).json({ error: 'No se pudo completar la operación.' });
      }
    }
  };
}

export function parametro(req: Request, nombre: string): string {
  const valor = req.params[nombre];
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new ErrorBancoPreguntas('validacion', 'Identificador no válido.');
  }
  return valor;
}
