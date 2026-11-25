import { Request } from 'express';
import { AlcanceAdministrador, RolUsuario } from '../../usuarios';
import { ActorBanco } from '../aplicacion/actor-banco';

export function actorBanco(req: Request): ActorBanco {
  const usuario = req.usuario;
  if (usuario?.rol === RolUsuario.Administrador && usuario.alcanceAdministrador === AlcanceAdministrador.General) {
    return { id: usuario.id, permiso: 'general' };
  }
  if (usuario?.rol === RolUsuario.Docente) return { id: usuario.id, permiso: 'docente' };
  return { id: usuario?.id ?? '', permiso: 'ninguno' };
}
