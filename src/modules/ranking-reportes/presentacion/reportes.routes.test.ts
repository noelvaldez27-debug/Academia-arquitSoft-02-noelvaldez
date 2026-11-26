import ExcelJS from 'exceljs';
import request from 'supertest';
import { crearApp } from '../../../compartido/infraestructura';
import { AlcanceAdministrador, MiddlewareAutenticacion, RolUsuario } from '../../usuarios';
import { ConsultarRankingUseCase } from '../aplicacion/consultar-ranking.use-case';
import { ConsultarReporteUseCase } from '../aplicacion/consultar-reporte.use-case';
import { proyectarRanking } from '../dominio/proyeccion-ranking';
import { exportarReporteExcel, tipoExcel } from '../infraestructura/exportar-reporte-excel';
import { crearRutasRanking } from './ranking.routes';
import { crearRutasReportes } from './reportes.routes';

it('CA-RR03–CA-RR04 aplica los mismos filtros y permisos en JSON y Excel', async () => {
  const intentos = ['1', '2', '3'].map(id => ({
    id, postulanteId: id, sedeId: id === '3' ? '2' : '1', carrera: 'MEDICINA', condicion: null,
    inicio: '2026-11-25T12:00:00.000Z', cierre: id === '2' ? null : '2026-11-25T12:10:00.000Z',
  }));
  const proyeccion = proyectarRanking(intentos, [intentos[0], intentos[2]].map(({ id }) => ({
    examenId: id, puntajeCentesimos: 50000, correctas: 1, incorrectas: 0, omitidas: 1,
    porCurso: [{ cursoId: 'c', correctas: 1, incorrectas: 0, omitidas: 1 }],
  })), false);
  const consultar = async () => proyeccion;
  const autenticar: MiddlewareAutenticacion['autenticar'] = async (req, _res, next) => {
    const docente = req.get('x-actor') === 'docente';
    req.usuario = {
      id: '1', sedeId: '1', rol: docente ? RolUsuario.Docente : RolUsuario.Administrador,
      alcanceAdministrador: docente ? null : AlcanceAdministrador.Sede,
    } as Express.Request['usuario'];
    next();
  };
  const rutas = crearRutasRanking(new ConsultarRankingUseCase(consultar), { autenticar } as MiddlewareAutenticacion);
  rutas.use(crearRutasReportes(new ConsultarReporteUseCase(consultar, async () => ['c']), exportarReporteExcel, tipoExcel));
  const http = request(crearApp({ rutasRanking: rutas }));
  const base = '/api/v1/rankings/s/reportes';
  const filtro = '?condicion=NO_DETERMINADA&desde=2026-11-25T07:00:00-05:00';
  const participacion = await http.get(base + '/participacion' + filtro).expect(200);
  expect(participacion.body.resumen).toEqual({ inscritos: null, participantes: 2, enCurso: 1,
    finalizados: 1, calificados: 1, noParticipantes: null, porcentajeParticipacion: null });
  const meritos = await http.get(base + '/meritos' + filtro).expect(200);
  expect(meritos.body.filas.map((fila: { postulanteId: string }) => fila.postulanteId)).toEqual(['1']);
  const archivo = await http.get(base + '/meritos' + filtro + '&formato=xlsx').buffer(true)
    .parse((res, terminar) => {
      const fragmentos: Buffer[] = [];
      res.on('data', fragmento => fragmentos.push(Buffer.from(fragmento)));
      res.on('end', () => terminar(null, Buffer.concat(fragmentos)));
    }).expect('Content-Type', tipoExcel).expect(200);
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(archivo.body);
  const fila = libro.worksheets[0].getRow(2);
  expect(Object.values(meritos.body.filas[0]).map((_valor, i) => fila.getCell(i + 1).value))
    .toEqual(Object.values(meritos.body.filas[0]));
  await http.get(base + '/meritos?sedeId=2&formato=xlsx').expect(403);
  await http.get(base + '/resultados?condicion=otra').expect(400);
  await http.get(base + '/resultados?desde=ayer').expect(400);
  await http.get(base + '/cursos/otro').set('x-actor', 'docente').expect(403);
  await http.get(base + '/resultados?formato=xlsx').set('x-actor', 'docente').expect(403);
  const agregado = await http.get(base + '/cursos/c').set('x-actor', 'docente').expect(200);
  expect(agregado.body).toEqual({ simulacroId: 's', cursoId: 'c', definitiva: false,
    resumen: { calificados: 2, correctas: 2, incorrectas: 0, omitidas: 2 } });
});
