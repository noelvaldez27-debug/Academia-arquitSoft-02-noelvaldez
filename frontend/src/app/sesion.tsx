import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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
  perfil: Perfil;
  cambioInicial: boolean;
  vence: number;
}

interface EstadoSesion {
  sesion: Sesion | null;
  vencida: boolean;
  ingresar(correo: string, password: string, signal: AbortSignal): Promise<void>;
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
  const [vencida, avisarVencimiento] = useState(false);
  useEffect(() => {
    if (!sesion) return;
    let reloj: ReturnType<typeof setTimeout>;
    const revisar = () => {
      const restante = sesion.vence - Date.now();
      if (restante <= 0) {
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
    guardar({ token, nombre: usuario.nombre, perfil: perfilDe(usuario), vence, cambioInicial: Boolean(cambioPasswordRequerido) });
    avisarVencimiento(false);
  }

  return <Contexto.Provider value={{
    sesion, vencida, ingresar, salir: () => { guardar(null); avisarVencimiento(false); },
  }}>{children}</Contexto.Provider>;
}

export function usarSesion(): EstadoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('La sesión requiere el proveedor de la aplicación.');
  return contexto;
}
