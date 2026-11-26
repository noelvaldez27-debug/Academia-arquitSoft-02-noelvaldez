import { existenIntentosActivos, RendicionModule, rutasOpenApiRendicion } from './modules/rendicion-examen';
import { ResultadosModule, rutasOpenApiResultados } from './modules/resultados';
import { BancoPreguntasModule, rutasOpenApiBanco } from './modules/banco-preguntas';
import { AlmacenArchivosLocal, crearApp, crearPoolPostgres, crearClienteRedis, obtenerConfiguracionRedisDesdeEnv } from './compartido/infraestructura';
import { crearConsultaPostulanteHabilitado, UsuariosModule } from './modules/usuarios';
import { RankingReportesModule, rutasOpenApiRanking } from './modules/ranking-reportes';
import { AnaliticaModule, rutasOpenApiAnalitica } from './modules/analitica';
import { ServicioIAGemini } from './compartido/infraestructura/servicio-ia-gemini';
import { ServicioIASimulado } from './compartido/infraestructura/servicio-ia-simulado';

const pool = crearPoolPostgres();
const usuariosModule = new UsuariosModule({ pool, consultarIntentosActivos: existenIntentosActivos });

void usuariosModule.consumidorCargaMasiva.ejecutar();

const almacen = new AlmacenArchivosLocal(process.env.ALMACEN_LOCAL_PATH?.trim() || './uploads');
const limiteSeparataMb = Number(process.env.SEPARATA_MAX_MB ?? '20');
if (!Number.isFinite(limiteSeparataMb) || limiteSeparataMb <= 0) {
  throw new Error('SEPARATA_MAX_MB debe ser positivo.');
}
const bancoPreguntas = new BancoPreguntasModule(pool, usuariosModule.middlewareAutenticacion, almacen,
  Math.floor(limiteSeparataMb * 1024 * 1024), usuariosModule.servicioConsultaUsuarios);
const redis = crearClienteRedis({
  ...obtenerConfiguracionRedisDesdeEnv(), enableOfflineQueue: false, maxRetriesPerRequest: 0, commandTimeout: 3000,
  autoResendUnfulfilledCommands: false,
});
const rendicion = new RendicionModule(pool, redis, bancoPreguntas, usuariosModule.middlewareAutenticacion,
  usuariosModule.servicioConsultaUsuarios, crearConsultaPostulanteHabilitado);
const resultados = new ResultadosModule(pool, rendicion.examenesFinalizados, usuariosModule.middlewareAutenticacion);
rendicion.iniciarTrabajos(resultados.consultas.contarCalificados);
const rankings = new RankingReportesModule(pool, rendicion.consultasReportes, resultados.consultas,
  usuariosModule.middlewareAutenticacion, bancoPreguntas.cursosAsignados);
rankings.iniciarTrabajos();

function configurarIaAnalitica() {
  if (process.env.ANALITICA_IA === 'simulada') return new ServicioIASimulado();
  if (process.env.ANALITICA_IA !== 'gemini') return undefined;
  try {
    return new ServicioIAGemini(process.env.GEMINI_API_KEY ?? '', process.env.GEMINI_MODELO ?? '');
  } catch {
    console.error('Configuración del proveedor de Analítica no disponible.');
    return undefined;
  }
}
const analitica = new AnaliticaModule(pool, usuariosModule.middlewareAutenticacion,
  { ...resultados.consultas, paraAnalitica: resultados.resultadosParaAnalitica },
  bancoPreguntas.cursosAsignados, configurarIaAnalitica());

const app = crearApp({
  rutasUsuarios: usuariosModule.router,
  rutasBancoPreguntas: bancoPreguntas.rutas,
  rutasRendicion: rendicion.rutas,
  rutasResultados: resultados.rutas,
  rutasRanking: rankings.rutas,
  rutasAnalitica: analitica.rutas,
  rutasOpenApiAdicionales: { ...rutasOpenApiBanco, ...rutasOpenApiRendicion, ...rutasOpenApiResultados,
    ...rutasOpenApiRanking, ...rutasOpenApiAnalitica },
});
const port = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Servidor EVALUA-NET escuchando en http://${host}:${port}`);
  console.log(`Documentación Swagger disponible en http://${host}:${port}/api-docs`);
});
