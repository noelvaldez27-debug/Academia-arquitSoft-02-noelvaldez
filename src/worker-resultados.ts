import { crearConexionRabbitMQ, crearPoolPostgres } from './compartido/infraestructura';
import { crearConsultaClavesCongeladas } from './modules/banco-preguntas';
import { crearConsultaExamenesFinalizados } from './modules/rendicion-examen';
import { iniciarWorkerResultados } from './modules/resultados';

const pool = crearPoolPostgres();
void iniciarWorkerResultados(pool, crearConsultaExamenesFinalizados(pool), crearConsultaClavesCongeladas(pool), crearConexionRabbitMQ);
