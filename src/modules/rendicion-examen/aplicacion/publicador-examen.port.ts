export interface PublicadorExamen {
  publicar(examenId: string): Promise<void>;
}
