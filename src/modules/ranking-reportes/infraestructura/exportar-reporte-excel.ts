import ExcelJS from 'exceljs';
import type { ConsultarReporteUseCase } from '../aplicacion/consultar-reporte.use-case';

type Reporte = Awaited<ReturnType<ConsultarReporteUseCase['administrativo']>>;
export const tipoExcel = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function exportarReporteExcel(reporte: Reporte): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Reporte');
  if ('resumen' in reporte) {
    const { inscritos, participantes, enCurso, finalizados, calificados, noParticipantes, porcentajeParticipacion } = reporte.resumen;
    hoja.addRow(['Simulacro', 'Estado', 'Inscritos', 'Participantes', 'En curso', 'Finalizados', 'Calificados',
      'No participantes', 'Porcentaje de participación']);
    hoja.addRow([reporte.simulacroId, reporte.estado, inscritos ?? 'No disponible', participantes, enCurso, finalizados,
      calificados, noParticipantes ?? 'No disponible', porcentajeParticipacion ?? 'No disponible']);
  } else {
    hoja.addRow(['Simulacro', 'Postulante', 'Carrera', 'Sede', 'Condición', 'Puntaje sobre 1000',
      'Correctas', 'Incorrectas', 'Omitidas', 'Puesto', 'Estado']);
    for (const fila of reporte.filas) {
      hoja.addRow([fila.simulacroId, fila.postulanteId, fila.carrera, fila.sedeId, fila.condicion,
        fila.puntaje, fila.correctas, fila.incorrectas, fila.omitidas, fila.puesto, fila.estado]);
    }
  }
  return Buffer.from(await libro.xlsx.writeBuffer());
}
