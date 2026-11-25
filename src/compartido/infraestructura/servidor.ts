import express, { Application, Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { especificacionOpenApi } from './especificacion-openapi';

export interface OpcionesServidor {
  rutasUsuarios?: Router;
  rutasBancoPreguntas?: Router;
  rutasRendicion?: Router;
  rutasResultados?: Router;
  rutasOpenApiAdicionales?: Record<string, object>;
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

  if (opciones?.rutasBancoPreguntas) app.use('/api/banco-preguntas', opciones.rutasBancoPreguntas);

  if (opciones?.rutasRendicion) app.use('/api/v1/examenes', opciones.rutasRendicion);
  if (opciones?.rutasResultados) app.use('/api/v1/resultados', opciones.rutasResultados);

  const documentacion = {
    ...especificacionOpenApi,
    paths: { ...especificacionOpenApi.paths, ...opciones?.rutasOpenApiAdicionales },
  };
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(documentacion));

  return app;
}
