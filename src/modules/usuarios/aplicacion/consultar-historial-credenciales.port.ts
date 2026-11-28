export interface EventoCredencial {
  id: string;
  evento: string;
  creadoEn: string;
  actor: { id: string; nombre: string };
}

export interface ConsultaHistorialCredencialesPort {
  consultar(targetId: string, actorId: string, pagina: number, limite: number): Promise<{
    cambioObligatorio: boolean;
    venceEn: string | null;
    eventos: EventoCredencial[];
    total: number;
  } | null>;
}
