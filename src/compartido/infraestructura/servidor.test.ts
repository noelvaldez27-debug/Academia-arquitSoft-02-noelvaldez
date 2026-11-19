import request from 'supertest';
import { crearApp } from './servidor';
import { especificacionOpenApi } from './especificacion-openapi';

describe('Servidor HTTP base y Swagger', () => {
  const app = crearApp();

  describe('GET /health', () => {
    it('debe responder 200 con JSON conteniendo status "ok" y timestamp ISO válido', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });

      const parsedDate = new Date(response.body.timestamp);
      expect(parsedDate.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Swagger UI (/api-docs)', () => {
    it('debe servir la interfaz web de Swagger UI en /api-docs/', async () => {
      const response = await request(app).get('/api-docs/');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('swagger-ui');
    });

    it('debe redirigir /api-docs a /api-docs/ (o responder 200/301)', async () => {
      const response = await request(app).get('/api-docs');

      expect([200, 301, 302]).toContain(response.status);
    });
  });

  describe('Rutas no encontradas', () => {
    it('debe responder 404 para una ruta no definida', async () => {
      const response = await request(app).get('/ruta-no-existente');

      expect(response.status).toBe(404);
    });
  });

  describe('Especificación OpenAPI', () => {
    it('debe tener versión OpenAPI 3.0.0 y metadatos del proyecto', () => {
      expect(especificacionOpenApi.openapi).toBe('3.0.0');
      expect(especificacionOpenApi.info.title).toBe('EVALUA-NET API');
      expect(especificacionOpenApi.info.version).toBe('0.1.0');
    });

    it('debe describir exactamente la ruta /health y su respuesta 200', () => {
      const healthPath = especificacionOpenApi.paths['/health'];
      expect(healthPath).toBeDefined();
      expect(healthPath.get).toBeDefined();

      const response200 = healthPath.get.responses['200'];
      expect(response200).toBeDefined();

      const jsonSchema =
        response200.content['application/json'].schema;
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.required).toEqual(['status', 'timestamp']);
      expect(jsonSchema.properties.status.type).toBe('string');
      expect(jsonSchema.properties.timestamp.type).toBe('string');
    });
  });
});
