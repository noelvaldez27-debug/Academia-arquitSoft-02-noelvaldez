export { RendicionModule } from './rendicion.module';
export { rutasOpenApiRendicion } from './presentacion/rendicion.openapi';
export type { ExamenFinalizado } from './dominio/examen-repository';
export { crearConsultaExamenesFinalizados } from './infraestructura/postgres-examen-repository';
export { crearConsultaIntentosCerrados } from './infraestructura/postgres-examen-repository';
export { existenIntentosActivos } from './infraestructura/postgres-examen-repository';
export { tieneSimulacrosPorCerrar } from './infraestructura/postgres-padron-simulacro';
export type { IntentoCerradoParaAnalitica } from './infraestructura/postgres-examen-repository';
export type { IntentoParaReportes } from './dominio/examen';
