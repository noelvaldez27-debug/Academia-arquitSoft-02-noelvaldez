import { RendicionModule, rutasOpenApiRendicion } from './modules/rendicion-examen';
import { ResultadosModule, rutasOpenApiResultados } from './modules/resultados';
import { BancoPreguntasModule, rutasOpenApiBanco } from './modules/banco-preguntas';
import { AlmacenArchivosLocal, crearApp, crearPoolPostgres, crearClienteRedis, obtenerConfiguracionRedisDesdeEnv } from './compartido/infraestructura';
import { UsuariosModule } from './modules/usuarios';
import { RankingReportesModule, rutasOpenApiRanking } from './modules/ranking-reportes';

const pool = crearPoolPostgres();
const usuariosModule = new UsuariosModule({ pool });

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
  usuariosModule.servicioConsultaUsuarios);
const resultados = new ResultadosModule(pool, rendicion.examenesFinalizados, usuariosModule.middlewareAutenticacion);
rendicion.iniciarTrabajos(resultados.consultas.contarCalificados);
const rankings = new RankingReportesModule(pool, rendicion.consultasReportes, resultados.consultas,
  usuariosModule.middlewareAutenticacion);
rankings.iniciarTrabajos();

const app = crearApp({
  rutasUsuarios: usuariosModule.router,
  rutasBancoPreguntas: bancoPreguntas.rutas,
  rutasRendicion: rendicion.rutas,
  rutasResultados: resultados.rutas,
  rutasRanking: rankings.rutas,
  rutasOpenApiAdicionales: { ...rutasOpenApiBanco, ...rutasOpenApiRendicion, ...rutasOpenApiResultados, ...rutasOpenApiRanking },
});
const port = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Servidor EVALUA-NET escuchando en http://${host}:${port}`);
  console.log(`Documentación Swagger disponible en http://${host}:${port}/api-docs`);
});
