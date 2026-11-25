export async function* paginar<T>(
  consultar: (cursor?: string) => Promise<T[]>,
  obtenerId: (fila: T) => string,
): AsyncGenerator<T[]> {
  let cursor: string | undefined;
  for (;;) {
    const filas = await consultar(cursor);
    if (!filas.length) return;
    yield filas;
    cursor = obtenerId(filas[filas.length - 1]);
  }
}
