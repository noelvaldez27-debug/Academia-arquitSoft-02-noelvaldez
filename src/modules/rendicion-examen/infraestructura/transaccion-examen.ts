import { Pool } from 'pg';
import { OperacionesExamen, TransaccionExamen } from '../aplicacion/transaccion-examen.port';
import { PostgresExamenRepository } from './postgres-examen-repository';
import { PostgresCierreSimulacro } from './postgres-cierre-simulacro';
import { HabilitadoSimulacro, PostgresPadronSimulacro } from './postgres-padron-simulacro';
import { ErrorRendicion } from '../dominio/error-rendicion';

export interface FuentesPadron {
  requierePadron(bd: Pick<Pool, 'query'>): (id: string) => Promise<boolean | null>;
  ciclos(bd: Pick<Pool, 'query'>): {
    bloquearAbierto(id: string): Promise<void>;
    habilitados(id: string): Promise<HabilitadoSimulacro[]>;
    sigueVinculado(cicloId: string, postulanteId: string): Promise<boolean>;
  };
}

export function crearTransaccionExamen(
  pool: Pool, consultas: (bd: Pick<Pool, 'query'>) => OperacionesExamen['consultarSimulacro'],
  habilitar?: (bd: Pick<Pool, 'query'>) => OperacionesExamen['consultarPostulanteHabilitado'],
  fuentesPadron?: FuentesPadron,
): TransaccionExamen {
  return async operar => {
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      const cierres = new PostgresCierreSimulacro(cliente);
      const padrones = new PostgresPadronSimulacro(cliente);
      const consultarSimulacro = consultas(cliente);
      const ciclos = fuentesPadron?.ciclos(cliente);
      const requierePadron = fuentesPadron?.requierePadron(cliente);
      const resultado = await operar({
        examenes: new PostgresExamenRepository(cliente),
        consultarSimulacro,
        consultarPostulanteHabilitado: habilitar?.(cliente),
        coordinarInicio: id => cierres.coordinarInicio(id),
        solicitarCierre: (id, administradorId) => cierres.solicitar(id, administradorId),
        ...(requierePadron && ciclos && {
          verificarPadron: async (id: string, postulanteId: string) => {
            const requerida = await requierePadron(id);
            if (!requerida) return null;
            const padron = await padrones.encabezado(id);
            if (!padron) throw new ErrorRendicion('conflicto', 'El simulacro aún no está habilitado.');
            const miembro = await padrones.miembro(id, postulanteId);
            if (!miembro || !await ciclos.sigueVinculado(padron.cicloId, postulanteId)) {
              throw new ErrorRendicion('conflicto', 'El postulante no está habilitado para este simulacro.');
            }
            return miembro;
          },
          habilitarSimulacro: async (id: string, cicloId: string, administradorId: string) => {
            const previo = await padrones.encabezado(id);
            if (previo) {
              if (previo.cicloId !== cicloId) throw new ErrorRendicion('conflicto', 'El simulacro pertenece a otro ciclo.');
              return previo;
            }
            await ciclos.bloquearAbierto(cicloId);
            const enCierre = await cierres.coordinarHabilitacion(id);
            const despuesDelBloqueo = await padrones.encabezado(id);
            if (despuesDelBloqueo) {
              return padrones.consolidar(id, cicloId, administradorId, []);
            }
            if (enCierre) throw new ErrorRendicion('conflicto', 'El simulacro ya inició su cierre.');
            const requerida = await requierePadron(id);
            if (requerida === null) throw new ErrorRendicion('no-encontrado', 'Simulacro no encontrado.');
            if (!requerida) throw new ErrorRendicion('conflicto', 'El simulacro histórico no tiene un padrón verificable.');
            await consultarSimulacro(id);
            return padrones.consolidar(id, cicloId, administradorId, await ciclos.habilitados(cicloId));
          },
        }),
      });
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  };
}
