export interface EmisionProvisional {
  passwordHash: string;
  referencia: string;
  administradorId: string;
  cargaId?: string;
  tipoPassword?: 'ALEATORIA' | 'DNI';
  requiereCambio?: boolean;
}
