import type { Alternativa } from './contratos';

export const retencionMs = 24 * 60 * 60 * 1000;

export interface Operacion {
  orden: number;
  estudiante: string;
  intento: string;
  numero: number;
  alternativa: Alternativa | null;
  revisionBase: number;
  operacionId: string;
  caduca: number;
}

export function proximaRevision(operaciones: Pick<Operacion, 'numero' | 'revisionBase'>[], numero: number, confirmada: number) {
  return operaciones.reduce((revision, op) => op.numero === numero ? Math.max(revision, op.revisionBase + 1) : revision, confirmada);
}

function responder<T>(solicitud: IDBRequest<T>) {
  return new Promise<T>((resolver, rechazar) => {
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

async function usar<T>(accion: (tabla: IDBObjectStore) => Promise<T>) {
  const solicitud = indexedDB.open('evalua-net-rendicion', 1);
  solicitud.onupgradeneeded = () => {
    const tabla = solicitud.result.createObjectStore('marcas', { keyPath: 'orden', autoIncrement: true });
    tabla.createIndex('intento', ['estudiante', 'intento']);
    tabla.createIndex('caducidad', 'caduca');
  };
  const bd = await responder(solicitud);
  try {
    const tx = bd.transaction('marcas', 'readwrite');
    const completa = new Promise<void>((resolver, rechazar) => {
      tx.oncomplete = () => resolver();
      tx.onabort = () => rechazar(tx.error ?? new Error('No se pudo guardar en el dispositivo.'));
      tx.onerror = () => rechazar(tx.error ?? new Error('No se pudo guardar en el dispositivo.'));
    });
    const [valor] = await Promise.all([accion(tx.objectStore('marcas')), completa]);
    return valor;
  } finally { bd.close(); }
}

async function vigentes(tabla: IDBObjectStore, estudiante: string, intento: string, ahora: number) {
  const caducadas = await responder(tabla.index('caducidad').getAllKeys(IDBKeyRange.upperBound(ahora)));
  await Promise.all(caducadas.map(clave => responder(tabla.delete(clave))));
  return await responder(tabla.index('intento').getAll([estudiante, intento])) as Operacion[];
}

export const colaLocal = {
  listar(estudiante: string, intento: string) {
    return usar(tabla => vigentes(tabla, estudiante, intento, Date.now()));
  },

  agregar(estudiante: string, intento: string, numero: number, alternativa: Alternativa | null, revision: number) {
    return usar(async tabla => {
      const ahora = Date.now();
      const anteriores = await vigentes(tabla, estudiante, intento, ahora);
      const operacion = {
        estudiante, intento, numero, alternativa, revisionBase: proximaRevision(anteriores, numero, revision),
        operacionId: crypto.randomUUID(), caduca: ahora + retencionMs,
      };
      const orden = Number(await responder(tabla.add(operacion)));
      return [...anteriores, { ...operacion, orden }];
    });
  },

  quitar(orden: number) {
    return usar(tabla => responder(tabla.delete(orden)));
  },

  limpiar(estudiante: string, intento: string, numero?: number) {
    return usar(async tabla => {
      const operaciones = await vigentes(tabla, estudiante, intento, Date.now());
      await Promise.all(operaciones.filter(op => numero === undefined || op.numero === numero)
        .map(op => responder(tabla.delete(op.orden))));
    });
  },
};
