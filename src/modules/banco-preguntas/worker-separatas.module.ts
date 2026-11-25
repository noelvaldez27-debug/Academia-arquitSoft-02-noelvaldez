import { Pool } from 'pg';
import { AlmacenArchivos } from '../../compartido/aplicacion/almacen-archivos';
import { ServicioIA } from '../../compartido/aplicacion/servicio-ia';
import { ExtraerTextoUseCase } from './aplicacion/extraer-texto.use-case';
import { ProcesarSeparataUseCase } from './aplicacion/procesar-separata.use-case';
import { ExtractorDocxAdapter } from './infraestructura/extractor-docx.adapter';
import { ExtractorPdfAdapter } from './infraestructura/extractor-pdf.adapter';
import { PostgresPreguntaRepository } from './infraestructura/postgres-pregunta-repository';
import { PostgresSeparataRepository } from './infraestructura/postgres-separata-repository';
import { RabbitmqSeparataAdapter } from './infraestructura/rabbitmq-separata.adapter';
import { SeparataWorker } from './infraestructura/separata.worker';

export function crearWorkerSeparatas(pool: Pool, almacen: AlmacenArchivos, ia: ServicioIA, generarId: () => string) {
  const extraer = new ExtraerTextoUseCase({
    'application/pdf': new ExtractorPdfAdapter(),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': new ExtractorDocxAdapter(),
  }, ia);
  const procesar = new ProcesarSeparataUseCase(
    new PostgresSeparataRepository(pool), new PostgresPreguntaRepository(pool), almacen, extraer, ia, generarId,
  );
  return new SeparataWorker(pool, new RabbitmqSeparataAdapter(pool), procesar);
}
