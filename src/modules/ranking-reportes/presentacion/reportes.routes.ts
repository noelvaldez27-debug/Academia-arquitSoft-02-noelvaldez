import { Request, Router } from 'express';
import { ConsultarReporteUseCase, FiltrosReporte, TipoReporte } from '../aplicacion/consultar-reporte.use-case';
import { ErrorConsultaRanking } from '../aplicacion/consultar-ranking.use-case';
import { actorRanking, ambitoSolicitado, filtro, responderRanking } from './ranking.routes';

export function crearRutasReportes(caso: ConsultarReporteUseCase,
  exportar: (reporte: Awaited<ReturnType<ConsultarReporteUseCase['administrativo']>>) => Promise<Buffer>,
  tipoExcel: string): Router {
  const router = Router();
  router.get('/:simulacroId/reportes/cursos/:cursoId', responderRanking(req =>
    caso.docente(actorRanking(req), String(req.params.simulacroId), String(req.params.cursoId))));
  router.get('/:simulacroId/reportes/:tipo', responderRanking(async (req, res) => {
    const tipo = tipoReporte(req.params.tipo);
    const formato = filtro(req, 'formato');
    if (formato !== undefined && formato !== 'xlsx') throw new ErrorConsultaRanking(400, 'Formato no disponible.');
    const reporte = await caso.administrativo(actorRanking(req), String(req.params.simulacroId), filtros(req), tipo);
    if (!formato) return reporte;
    const bytes = await exportar(reporte);
    res.set('Cache-Control', 'private, no-store').attachment(tipo + '.xlsx').type(tipoExcel).send(bytes);
  }));
  return router;
}

function tipoReporte(valor: unknown): TipoReporte {
  if (valor === 'participacion' || valor === 'resultados' || valor === 'meritos') return valor;
  throw new ErrorConsultaRanking(404, 'Reporte no disponible.');
}

function filtros(req: Request): FiltrosReporte {
  const condicion = filtro(req, 'condicion');
  if (condicion !== undefined && condicion !== 'MATRICULADO' && condicion !== 'LIBRE' && condicion !== 'NO_DETERMINADA') {
    throw new ErrorConsultaRanking(400, 'Condición inválida.');
  }
  const desde = fecha(filtro(req, 'desde'));
  const hasta = fecha(filtro(req, 'hasta'));
  if (desde && hasta && desde > hasta) throw new ErrorConsultaRanking(400, 'Rango de fechas inválido.');
  return { ...ambitoSolicitado(req), condicion, desde, hasta };
}

function fecha(valor?: string): string | undefined {
  if (valor === undefined) return undefined;
  const instante = Date.parse(valor);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(valor) ||
    !Number.isFinite(instante)) throw new ErrorConsultaRanking(400, 'Usa fecha y hora ISO 8601 con zona horaria.');
  return new Date(instante).toISOString();
}
