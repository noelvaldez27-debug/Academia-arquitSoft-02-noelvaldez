import express, { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { especificacionOpenApi } from './especificacion-openapi';

export function crearApp(): Application {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(especificacionOpenApi));

  return app;
}
