import { EstadoSeparata } from './estado-separata';

export interface Separata {
  id: string;
  docenteId: string;
  cursoId: string;
  archivo: string;
  mime: string;
  estado: EstadoSeparata;
  texto: string | null;
  motivo: string | null;
}

export type AlcanceAutorizacion = 'texto' | 'adjunto';

export interface AutorizacionExterna {
  separataId: string;
  autorizadorId: string;
  fecha: Date;
  estado: 'AUTORIZADA' | 'REVOCADA';
  alcance: AlcanceAutorizacion[];
}

export function permiteTransferencia(
  separataId: string, autorizacion: AutorizacionExterna | null, alcance: AlcanceAutorizacion,
): boolean {
  return autorizacion?.separataId === separataId &&
    autorizacion.estado === 'AUTORIZADA' && autorizacion.alcance.includes(alcance);
}
