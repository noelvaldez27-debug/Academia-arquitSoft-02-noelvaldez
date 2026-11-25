import request from 'supertest';
import { crearApp } from '../../../compartido/infraestructura';
import { AlcanceAdministrador, MiddlewareAutenticacion, RolUsuario } from '../../usuarios';
import { ConsultarRankingUseCase } from '../aplicacion/consultar-ranking.use-case';
import { proyectarRanking } from '../dominio/proyeccion-ranking';
import { crearRutasRanking } from './ranking.routes';

it('CA-RR03 devuelve el puesto propio y aplica los límites administrativos por sede', async () => {
  const intentos = ['1', '2'].map(id => ({
    id, postulanteId: id, sedeId: id, carrera: 'MEDICINA', condicion: null, inicio: 'inicio', cierre: 'cierre',
  }));
  const proyeccion = proyectarRanking(intentos, intentos.map(({ id }) => ({
    examenId: id, puntajeCentesimos: 50000, correctas: 1, incorrectas: 0, omitidas: 1, porCurso: [],
  })), false);
  const consultar = jest.fn().mockResolvedValue(proyeccion);
  const autenticar: MiddlewareAutenticacion['autenticar'] = async (req, res, next) => {
    const actor = req.get('x-actor');
    if (!actor) { res.sendStatus(401); return; }
    req.usuario = {
      id: '1',
      rol: actor === 'sede' ? RolUsuario.Administrador : RolUsuario.Postulante,
      alcanceAdministrador: actor === 'sede' ? AlcanceAdministrador.Sede : null, sedeId: '1',
    } as Express.Request['usuario'];
    next();
  };
  const rutas = crearRutasRanking(new ConsultarRankingUseCase(consultar), { autenticar } as MiddlewareAutenticacion);
  const http = request(crearApp({ rutasRanking: rutas }));
  const base = '/api/v1/rankings/s';
  await http.get(base + '/propio').expect(401);
  const propio = await http.get(base + '/propio').set('x-actor', 'postulante').expect(200);
  expect(propio.body).toEqual({ simulacroId: 's', definitiva: false, puntaje: 500,
    general: { puesto: 1, participantes: 2 }, carrera: { puesto: 1, participantes: 2 },
    sede: { puesto: 1, participantes: 1 } });
  await http.get(base).set('x-actor', 'postulante').expect(403);
  await http.get(base + '?sedeId=2').set('x-actor', 'sede').expect(403);
  const sede = await http.get(base + '?carrera=medicina').set('x-actor', 'sede').expect(200);
  expect(sede.body.filas).toEqual([{ postulanteId: '1', puesto: 1, puntaje: 500 }]);
});
