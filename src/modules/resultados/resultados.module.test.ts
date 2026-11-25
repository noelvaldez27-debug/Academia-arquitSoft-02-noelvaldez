import { Pool } from 'pg';
import request from 'supertest';
import { crearApp } from '../../compartido/infraestructura';
import { MiddlewareAutenticacion, RolUsuario } from '../usuarios';
import { ResultadosModule } from './resultados.module';
import { rutasOpenApiResultados } from './presentacion/resultados.openapi';

it('CA-PR05 distingue pendiente, ajeno y procesado y proyecta solo campos autorizados', async () => {
  let listo = false;
  const guardado = { examenId: 'e', simulacroId: 's', postulanteId: 'u', puntajeCentesimos: 33_333,
    correctas: 1, incorrectas: 1, omitidas: 1, porCurso: [], detalle: [{ preguntaId: 'p' }] };
  const query = jest.fn(async () => ({ rows: listo ? [guardado] : [] }));
  const autenticar: MiddlewareAutenticacion['autenticar'] = async (req, res, next) => {
    const id = req.get('x-usuario');
    if (!id) { res.sendStatus(401); return; }
    req.usuario = { id, rol: RolUsuario.Postulante } as Express.Request['usuario'];
    next();
  };
  const auth = { autenticar, requerirRol: () => (_req: unknown, _res: unknown, next: () => void) => next() };
  const consultar = jest.fn(async id => id === 'e' ? { examenId: id, postulanteId: 'u', simulacroId: 's', respuestas: [] } : null);
  const modulo = new ResultadosModule({ query } as unknown as Pool, { consultar }, auth as unknown as MiddlewareAutenticacion);
  const http = request(crearApp({ rutasResultados: modulo.rutas, rutasOpenApiAdicionales: rutasOpenApiResultados }));
  const url = '/api/v1/resultados/e';
  await http.get(url).expect(401);
  await http.get(url).set('x-usuario', 'otro').expect(404);
  await http.get(url + '-inexistente').set('x-usuario', 'u').expect(404);
  await http.get(url).set('x-usuario', 'u').expect(202).expect('Retry-After', '2')
    .expect({ estado: 'PENDIENTE', examenId: 'e' });
  listo = true;
  await http.get(url).set('x-usuario', 'otro').expect(404);
  await http.get(url).set('x-usuario', 'u').expect(200).expect('Cache-Control', 'no-store').expect({
    estado: 'PROCESADO', examenId: 'e', simulacroId: 's', puntaje: 333.33, correctas: 1, incorrectas: 1, omitidas: 1, porCurso: [],
  });
  expect(await modulo.consultas.porSimulacro('s')).toEqual([guardado]);
  expect(await modulo.consultas.porPostulante('u', 'a')).toEqual([guardado]);
  expect(query).toHaveBeenCalledWith(expect.stringContaining('postulante_id = $1'), ['u', 'a']);
  query.mockRejectedValueOnce(new Error('BD'));
  await http.get(url).set('x-usuario', 'u').expect(503);
});
