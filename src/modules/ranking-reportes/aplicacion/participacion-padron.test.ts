import { ConsultarReporteUseCase } from './consultar-reporte.use-case';
import type { ProyeccionRanking } from '../dominio/proyeccion-ranking';

test('CA-VS03 sede sin inscritos tiene cero real y una tasa no aplicable', async () => {
  const consultar = new ConsultarReporteUseCase(async () => null, async () => [], async () => []);
  const informe = await consultar.administrativo({ rol: 'sede', id: 'a', sedeId: '1' }, 's', {}, 'participacion');
  expect(informe).toMatchObject({ resumen: { inscritos: 0, participantes: 0, noParticipantes: 0,
    porcentajeParticipacion: null, enCurso: 0, finalizados: 0, calificados: 0 } });
});

test('CA-VS03 el grupo del reporte usa carrera y sede del padrón, incluso cuando difieren del intento', async () => {
  const proyeccion = {
    definitiva: true,
    intentos: [
      { id: 'e1', postulanteId: 'p1', sedeId: '2', carrera: 'INGENIERIA', condicion: null,
        inicio: '2026-01-01T00:00:00Z', cierre: '2026-01-01T00:04:00Z' },
      { id: 'e2', postulanteId: 'fuera', sedeId: '1', carrera: 'MEDICINA', condicion: null,
        inicio: '2026-01-01T00:00:00Z', cierre: null },
    ],
    calificaciones: [{ examenId: 'e1', puntajeCentesimos: 100000, correctas: 1, incorrectas: 0, omitidas: 0, porCurso: [] }],
    ambitos: [],
  } satisfies ProyeccionRanking;
  const consultar = new ConsultarReporteUseCase(async () => proyeccion, async () => [], async () => [
    { postulanteId: 'p1', sedeId: '1', carrera: 'MEDICINA', condicion: null },
    { postulanteId: 'p2', sedeId: '1', carrera: 'MEDICINA', condicion: null },
  ]);
  const admin = { rol: 'sede', id: 'a', sedeId: '1' } as const;
  await expect(consultar.administrativo(admin, 's', { sedeId: '2' }, 'participacion')).rejects.toThrow();
  const informe = await consultar.administrativo(admin, 's', { carrera: 'MEDICINA' }, 'participacion');
  expect(informe).toMatchObject({ resumen: { inscritos: 2, participantes: 1, noParticipantes: 1,
    porcentajeParticipacion: 50, enCurso: 0, finalizados: 1, calificados: 1 } });
});
