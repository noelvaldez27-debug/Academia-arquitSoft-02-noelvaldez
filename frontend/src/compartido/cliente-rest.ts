export class ErrorApi extends Error {
  constructor(readonly estado: number, mensaje: string) {
    super(mensaje);
  }
}

interface Solicitud extends Omit<RequestInit, 'body'> {
  datos?: unknown;
  sesion?: { token: string; alVencer: () => void };
  formato?: 'json' | 'archivo';
  recibirCabeceras?: (cabeceras: Headers) => void;
}

const mensajes: Record<number, string> = {
  400: 'Revisa los datos ingresados.',
  401: 'Verifica tu correo y contraseña e inténtalo nuevamente.',
  403: 'Tu cuenta no tiene acceso a esta operación.',
  404: 'El recurso no está disponible.',
  409: 'La información cambió. Vuelve a consultarla.',
  413: 'El archivo supera el tamaño permitido.',
  415: 'El formato del archivo no es válido.',
  422: 'Revisa los datos ingresados.',
};

export async function solicitarApi<T>(ruta: string, opciones: Solicitud = {}): Promise<T> {
  if (!ruta.startsWith('/api/') || ruta.includes('\\')) throw new Error('Ruta REST inválida.');
  const { datos, sesion, formato = 'json', recibirCabeceras, ...init } = opciones;
  const headers = new Headers(init.headers);
  if (sesion) headers.set('Authorization', 'Bearer ' + sesion.token);
  const formulario = datos instanceof FormData;
  if (datos !== undefined && !formulario) headers.set('Content-Type', 'application/json');

  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      ...init, headers, cache: 'no-store', mode: 'same-origin', redirect: 'error',
      body: datos === undefined ? undefined : formulario ? datos : JSON.stringify(datos),
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ErrorApi(0, 'No se pudo conectar. Revisa tu conexión e inténtalo nuevamente.');
  }
  if (respuesta.status === 401 && sesion) sesion.alVencer();
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, respuesta.status === 401 && sesion
      ? 'Tu sesión terminó. Vuelve a ingresar.'
      : mensajes[respuesta.status] ?? 'El servicio no está disponible en este momento.');
  }
  recibirCabeceras?.(respuesta.headers);
  if (respuesta.status === 204) return undefined as T;
  if (formato === 'archivo') return await respuesta.blob() as T;
  try {
    return await respuesta.json() as T;
  } catch {
    throw new ErrorApi(respuesta.status, 'El servicio devolvió una respuesta inesperada.');
  }
}
