import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const raiz = resolve(__dirname, 'modules');
const puertosCompartidos = new Set(['aplicacion/servicio-ia', 'aplicacion/almacen-archivos']);

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap(entrada => {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) return archivos(ruta);
    return ruta.endsWith('.ts') && !ruta.endsWith('.test.ts') ? [ruta] : [];
  });
}

test('CA-VS05 conserva capas, APIs públicas y un grafo de módulos acíclico', () => {
  const problemas: string[] = [];
  const grafo = new Map<string, Set<string>>();
  for (const ruta of archivos(raiz)) {
    const [modulo, capa] = relative(raiz, ruta).split(sep);
    const dependencias = grafo.get(modulo) ?? new Set<string>();
    grafo.set(modulo, dependencias);
    for (const importacion of ts.preProcessFile(readFileSync(ruta, 'utf8'), true, true).importedFiles) {
      const nombre = importacion.fileName;
      const destino = resolve(dirname(ruta), nombre);
      const partes = relative(raiz, destino).split(sep);
      const rutaCompartida = relative(join(raiz, '..', 'compartido'), destino).split(sep).join('/');
      const local = nombre.startsWith('.') && !partes[0].startsWith('..') &&
        (existsSync(destino + '.ts') || existsSync(join(destino, 'index.ts')));
      const propio = local && partes[0] === modulo;
      if (capa === 'dominio' && !(propio && partes[1] === 'dominio')) {
        problemas.push(relative(raiz, ruta) + ' importa ' + nombre);
      }
      if (capa === 'aplicacion' &&
          !(propio && ['dominio', 'aplicacion'].includes(partes[1])) &&
          !(nombre.startsWith('.') && puertosCompartidos.has(rutaCompartida))) {
        problemas.push(relative(raiz, ruta) + ' importa ' + nombre);
      }
      if (capa === 'presentacion' && propio && partes[1] === 'infraestructura') {
        problemas.push(relative(raiz, ruta) + ' importa ' + nombre);
      }
      if (local && !propio) {
        dependencias.add(partes[0]);
        if (partes.length > 1 && !(partes.length === 2 && partes[1] === 'index')) {
          problemas.push(relative(raiz, ruta) + ' accede a un archivo interno de ' + partes[0]);
        }
      }
    }
  }
  const visitados = new Set<string>();
  function visitar(modulo: string, recorrido: string[]) {
    if (recorrido.includes(modulo)) {
      problemas.push([...recorrido, modulo].join(' -> '));
      return;
    }
    if (visitados.has(modulo)) return;
    for (const destino of grafo.get(modulo) ?? []) visitar(destino, [...recorrido, modulo]);
    visitados.add(modulo);
  }
  for (const modulo of grafo.keys()) visitar(modulo, []);
  expect(problemas).toEqual([]);
});
