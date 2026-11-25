export { BancoPreguntasModule } from './banco-preguntas.module';
export { rutasOpenApiBanco } from './presentacion/banco-preguntas.openapi';
export async function iniciarWorkerSeparatas(
  ...argumentos: Parameters<typeof import('./worker-separatas.module').crearWorkerSeparatas>
): Promise<never> {
  const { crearWorkerSeparatas } = await import('./worker-separatas.module');
  return crearWorkerSeparatas(...argumentos).ejecutar();
}
export type {
  ConsultaClavesSimulacro,
  ConsultaSimulacros,
  SimulacroParaRendicion,
} from './aplicacion/gestionar-simulacros.use-case';
export { ErrorBancoPreguntas } from './dominio/errores';
export { crearConsultaClavesCongeladas } from './infraestructura/postgres-version-simulacro';
