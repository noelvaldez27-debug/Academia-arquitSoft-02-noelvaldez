export interface RestablecerPasswordPort {
  ejecutar(targetId: string, actorId: string, passwordHash: string): Promise<Date | null>;
}
