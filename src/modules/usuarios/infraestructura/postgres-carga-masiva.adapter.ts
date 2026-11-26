import { Pool } from 'pg';
import { PersistenciaCargaMasiva, TransaccionCargaMasiva } from '../aplicacion/carga-masiva.port';
import { GeneradorCredenciales } from '../aplicacion/generar-credenciales';
import { RegistrarEstudianteUseCase } from '../aplicacion/registrar-estudiante.use-case';
import { PostgresCargaMasivaRepository } from './postgres-carga-masiva-repository';
import { PostgresSedeRepository } from './postgres-sede-repository';
import { PostgresUsuarioRepository } from './postgres-usuario-repository';
import type { CredencialesProvisionales } from './credenciales-provisionales';
import { PostgresRegistroCiclo } from './postgres-registro-ciclo';

export class PostgresCargaMasivaAdapter implements PersistenciaCargaMasiva {
  constructor(private readonly pool: Pool, private readonly credenciales: GeneradorCredenciales,
    private readonly provisionales?: CredencialesProvisionales) {}

  async transaccion<T>(operacion: (contexto: TransaccionCargaMasiva) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const cargas = new PostgresCargaMasivaRepository(cliente);
      const usuarios = new PostgresUsuarioRepository(cliente, true);
      const ciclos = new PostgresRegistroCiclo(cliente);
      const resultado = await operacion({
        cargas,
        usuarios,
        registro: new RegistrarEstudianteUseCase(usuarios, new PostgresSedeRepository(cliente), this.credenciales,
          this.provisionales?.emitir.bind(this.provisionales), ciclos.guardar.bind(ciclos)),
        verificarCiclo: id => ciclos.verificarAbierto(id),
        bloquearCarga: async id => {
          await cliente.query('SELECT id FROM cargas_masivas WHERE id = $1 FOR UPDATE', [id]);
          return cargas.buscarPorId(id);
        },
        guardarEnvios: async (id, lotes) => {
          await cliente.query(
            'INSERT INTO envios_carga_masiva (carga_id, numero_lote) SELECT $1, generate_series(1, $2::integer)',
            [id, lotes],
          );
        },
      });
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }
}
