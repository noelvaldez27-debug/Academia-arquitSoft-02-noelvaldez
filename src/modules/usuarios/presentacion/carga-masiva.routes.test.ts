import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { AlcanceAdministrador, CargaMasiva, CargaMasivaRepository, RolUsuario } from '../dominio';
import { ConsultarCargaMasivaUseCase } from '../aplicacion/consultar-carga-masiva.use-case';
import { PrepararCargaMasivaUseCase } from '../aplicacion/preparar-carga-masiva.use-case';
import { MiddlewareAutenticacion } from './autenticacion.middleware';
import { crearRutasCargaMasiva } from './carga-masiva.routes';

const id = '12345678-1234-1234-1234-123456789012';

function preparar() {
  const ejecutar = jest.fn().mockResolvedValue(id);
  const caso = { ejecutar } as unknown as PrepararCargaMasivaUseCase;
  const carga = new CargaMasiva({ id, usuarioId: 9, sedeId: 1 });
  const consultar = new ConsultarCargaMasivaUseCase({
    buscarPorId: async (buscado: string) => buscado === id ? carga : null,
  } as CargaMasivaRepository);
  const autenticacion = {
    autenticar: (req: Request, res: Response, next: NextFunction) => {
      const sede = req.header('X-Sede');
      if (!sede) {
        res.sendStatus(401);
        return;
      }
      req.usuario = {
        id: '9', nombre: 'Admin', correo: 'admin@sofia.edu', activo: true,
        sedeId: sede, carrera: null,
        rol: req.header('X-Postulante') ? RolUsuario.Postulante : RolUsuario.Administrador,
        alcanceAdministrador: AlcanceAdministrador.Sede,
      };
      next();
    },

  };
  const middleware = new MiddlewareAutenticacion({} as never, {} as never);
  const app = express().use(crearRutasCargaMasiva(caso, consultar, {
    ...middleware,
    autenticar: autenticacion.autenticar,
  } as MiddlewareAutenticacion, 1));
  return { app, ejecutar };
}

describe('Rutas de carga masiva (CA-U13)', () => {
  it('acepta XLSX por multipart y retorna 202 con la ubicación', async () => {
    const { app, ejecutar } = preparar();
    const archivo = Buffer.from('xlsx de prueba');
    const respuesta = await request(app).post('/cargas-masivas').query({ cicloId: id })
      .set('X-Sede', '1').attach('archivo', archivo, 'alumnos.xlsx');
    expect(respuesta.status).toBe(202);
    expect(respuesta.body).toEqual({ id });
    expect(respuesta.headers.location).toBe('/api/usuarios/cargas-masivas/' + id);
    expect(ejecutar).toHaveBeenCalledWith(archivo, expect.objectContaining({ sedeId: '1' }), id);
  });

  it('exige un ciclo destino válido antes de aceptar el archivo', async () => {
    const { app, ejecutar } = preparar();
    await request(app).post('/cargas-masivas').set('X-Sede', '1')
      .attach('archivo', Buffer.from('xlsx sintético'), 'alumnos.xlsx')
      .expect(400).expect(({ body }) => expect(body.error).toContain('ciclo académico abierto'));
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('rechaza archivos con extensión incorrecta y solicitantes sin permisos', async () => {
    const { app, ejecutar } = preparar();
    const archivo = Buffer.from('prueba');
    await request(app).post('/cargas-masivas').set('X-Sede', '1').attach('archivo', archivo, 'datos.csv').expect(400);
    await request(app).post('/cargas-masivas').set('X-Sede', '1').set('X-Postulante', '1')
      .attach('archivo', archivo, 'datos.xlsx').expect(403);
    await request(app).post('/cargas-masivas').expect(401);
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('devuelve el resumen público y restringe la consulta por sede', async () => {
    const { app } = preparar();
    const ruta = '/cargas-masivas/' + id;
    const respuesta = await request(app).get(ruta).set('X-Sede', '1').expect(200);
    expect(respuesta.body).toEqual({
      id, estado: 'PENDIENTE', totalFilas: 0, creadas: 0, yaExistian: 0, rechazadas: 0, errores: [], avisos: [],
    });
    await request(app).get(ruta).set('X-Sede', '2').expect(403);
    await request(app).get('/cargas-masivas/00000000-0000-0000-0000-000000000000').set('X-Sede', '1').expect(404);
    await request(app).get('/cargas-masivas/invalido').set('X-Sede', '1').expect(400);
  });
});
