import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ErrorApi, solicitarApi } from '../compartido/cliente-rest';
import type { Perfil } from './navegacion';

interface RespuestaAcceso {
  token: string;
  cambioPasswordRequerido?: boolean;
  usuario: { id: string; nombre: string; correo: string; rol: string; sedeId: string | null };
}

interface Sesion {
  token: string;
  nombre: string;
  id: string;
  sedeId: string | null;
  perfil: Perfil;
  cambioInicial: boolean;
  vence: number;
}

interface EstadoSesion {
  sesion: Sesion | null;
  vencida: boolean;
  aviso: string;
  solicitar<T>(ruta: string, opciones?: Omit<Parameters<typeof solicitarApi>[1] & object, 'sesion'>): Promise<T>;
  completarCambio(mensaje: string): void;
  ingresar(correo: string, password: string, signal: AbortSignal): Promise<void>;
  configurarSalida(guardia: () => boolean): () => void;
  salir(): void;
}

const Contexto = createContext<EstadoSesion | null>(null);

function vencimiento(token: string): number {
  try {
    const segmento = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(segmento)) as { exp?: number };
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function perfilDe(usuario: RespuestaAcceso['usuario']): Perfil {
  if (usuario.rol === 'DOCENTE') return 'docente';
  if (usuario.rol === 'POSTULANTE') return 'postulante';
  if (usuario.rol === 'ADMINISTRADOR' && usuario.sedeId === null) return 'general';
  if (usuario.rol === 'ADMINISTRADOR' && usuario.sedeId) return 'sede';
  throw new ErrorApi(403, 'Tu cuenta no tiene un perfil habilitado.');
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, guardar] = useState<Sesion | null>(null);
  const [aviso, avisar] = useState('');
  const tokenActivo = useRef<string | null>(null);
  const guardiaSalida = useRef<(() => boolean) | undefined>(undefined);
  const configurarSalida = useCallback((guardia: () => boolean) => {
    guardiaSalida.current = guardia;
    return () => { if (guardiaSalida.current === guardia) guardiaSalida.current = undefined; };
  }, []);
  const [vencida, avisarVencimiento] = useState(false);
  useEffect(() => {
    if (!sesion) return;
    let reloj: ReturnType<typeof setTimeout>;
    const revisar = () => {
      const restante = sesion.vence - Date.now();
      if (restante <= 0) {
        tokenActivo.current = null;
        guardar(null);
        avisarVencimiento(true);
        return;
      }
      reloj = setTimeout(revisar, Math.min(restante, 2_147_483_647));
    };
    revisar();
    return () => clearTimeout(reloj);
  }, [sesion]);

  async function ingresar(correo: string, password: string, signal: AbortSignal) {
    const { usuario, token, cambioPasswordRequerido } = await solicitarApi<RespuestaAcceso>('/api/usuarios/login', {
      method: 'POST', datos: { correo, password }, signal,
    });
    if (signal.aborted) return;
    const vence = vencimiento(token);
    if (vence <= Date.now()) throw new ErrorApi(401, 'La sesión no está disponible. Vuelve a ingresar.');
    const perfil = perfilDe(usuario);
    tokenActivo.current = token;
    avisar('');
    guardar({ token, id: usuario.id, sedeId: usuario.sedeId, nombre: usuario.nombre, perfil, vence, cambioInicial: Boolean(cambioPasswordRequerido) });
    avisarVencimiento(false);
  }

  const solicitar = useCallback<EstadoSesion['solicitar']>(async (ruta, opciones) => {
      if (!sesion) throw new ErrorApi(401, 'Tu sesión terminó. Vuelve a ingresar.');
      const { token } = sesion;
      return solicitarApi(ruta, { ...opciones, sesion: { token, alVencer: () => {
        if (tokenActivo.current !== token) return;
        tokenActivo.current = null;
        guardar(null);
        avisarVencimiento(true);
      } } });
  }, [sesion]);

  return <Contexto.Provider value={{
    sesion, vencida, aviso, ingresar, configurarSalida,
    salir: () => { if (guardiaSalida.current && !guardiaSalida.current()) return; tokenActivo.current = null; guardar(null); avisar(''); avisarVencimiento(false); },
    completarCambio: mensaje => {
      tokenActivo.current = null;
      guardar(null);
      avisar(mensaje + ' Vuelve a ingresar.');
      avisarVencimiento(false);
    },
    solicitar,
  }}>{children}</Contexto.Provider>;
}

export function usarSesion(): EstadoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('La sesión requiere el proveedor de la aplicación.');
  return contexto;
}
