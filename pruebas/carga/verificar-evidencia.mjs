import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { contieneCredenciales } from './evidencia-segura.mjs';

const [directorio] = process.argv.slice(2);
if (!directorio) throw new Error('Indica el directorio de evidencias.');

for (const archivo of await readdir(directorio, { withFileTypes: true })) {
  if (!archivo.isFile()) continue;
  const entrada = createInterface({ input: createReadStream(join(directorio, archivo.name)), crlfDelay: Infinity });
  for await (const linea of entrada) {
    if (contieneCredenciales(linea)) {
      throw new Error('Posible credencial en la evidencia. La ejecución no se incorporó al repositorio.');
    }
  }
}
