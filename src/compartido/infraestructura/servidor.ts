import express, { Application, Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { especificacionOpenApi } from './especificacion-openapi';

export interface OpcionesServidor {
  rutasUsuarios?: Router;
}

export function crearApp(opciones?: OpcionesServidor): Application {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  if (opciones?.rutasUsuarios) {
    app.use('/api/usuarios', opciones.rutasUsuarios);
  }

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(especificacionOpenApi));

  return app;
}
