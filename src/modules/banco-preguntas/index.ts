export { BancoPreguntasModule } from './banco-preguntas.module';
export { rutasOpenApiBanco } from './presentacion/banco-preguntas.openapi';
export async function iniciarWorkerSeparatas(
  ...argumentos: Parameters<typeof import('./worker-separatas.module').crearWorkerSeparatas>
): Promise<never> {
  const { crearWorkerSeparatas } = await import('./worker-separatas.module');
  return crearWorkerSeparatas(...argumentos).ejecutar();
}
