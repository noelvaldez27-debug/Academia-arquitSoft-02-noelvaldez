import { randomUUID } from 'node:crypto';
import { AlmacenArchivosLocal } from './compartido/infraestructura/almacen-archivos-local';
import { crearPoolPostgres } from './compartido/infraestructura/conexion-postgres';
import { ServicioIAGemini } from './compartido/infraestructura/servicio-ia-gemini';
import { ServicioIASimulado } from './compartido/infraestructura/servicio-ia-simulado';
import { iniciarWorkerSeparatas } from './modules/banco-preguntas';

const ia = process.env.NODE_ENV !== 'test' && process.env.SEPARATAS_IA_PROVEEDOR === 'gemini'
  ? new ServicioIAGemini(process.env.GEMINI_API_KEY ?? '', process.env.GEMINI_MODELO ?? '')
  : new ServicioIASimulado();
const almacen = new AlmacenArchivosLocal(process.env.ALMACEN_LOCAL_PATH?.trim() || './uploads');

void iniciarWorkerSeparatas(crearPoolPostgres(), almacen, ia, randomUUID);
