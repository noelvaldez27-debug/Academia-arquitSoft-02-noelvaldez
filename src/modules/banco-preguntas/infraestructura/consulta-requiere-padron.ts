import type { Pool } from 'pg';

export function crearConsultaRequierePadron(bd: Pick<Pool, 'query'>) {
  return async (simulacroId: string): Promise<boolean | null> => {
    const { rows } = await bd.query<{ requiere_padron: boolean }>(
      'SELECT requiere_padron FROM configuraciones_simulacro WHERE id = $1', [simulacroId],
    );
    return rows[0]?.requiere_padron ?? null;
  };
}
