export interface PublicadorExamen {
  publicar(examenId: string): Promise<void>;
  publicarLote?(examenes: string[]): Promise<void>;
}
