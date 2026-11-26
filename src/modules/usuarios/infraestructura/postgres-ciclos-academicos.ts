import type { Pool } from 'pg';
import { ErrorAccesoDenegado, ErrorConflicto, ErrorNoEncontrado } from '../dominio';
import type { ConsultarActivos } from './postgres-archivar-postulantes';

const columnas = 'id, nombre, inicia_el::text AS "iniciaEl", termina_el::text AS "terminaEl", cerrado_en AS "cerradoEn"';

export class PostgresCiclosAcademicos {
  constructor(private readonly bd: Pick<Pool, 'query'>) {}

  async listar() {
    const { rows } = await this.bd.query(
      'SELECT ' + columnas + ' FROM ciclos_academicos ORDER BY inicia_el DESC, id',
    );
    return rows;
  }

  async crear(id: string, nombre: string, iniciaEl: string, terminaEl: string) {
    const { rows: [ciclo] } = await this.bd.query(
      'INSERT INTO ciclos_academicos (id,nombre,inicia_el,termina_el) VALUES ($1,$2,$3,$4) RETURNING ' + columnas,
      [id, nombre, iniciaEl, terminaEl],
    );
    return ciclo;
  }

  async cerrar(id: string, actorId: string,
    tieneSimulacrosPorCerrar: (bd: Pick<Pool, 'query'>, cicloId: string) => Promise<boolean>,
    consultarActivos: ConsultarActivos) {
    const { rows: [ciclo] } = await this.bd.query<{ cerradoEn: Date | null }>(
      'SELECT cerrado_en AS "cerradoEn" FROM ciclos_academicos WHERE id = $1 FOR UPDATE', [id],
    );
    if (!ciclo) throw new ErrorNoEncontrado('Ciclo no encontrado.');
    const { rows: autorizados } = await this.bd.query(
      `SELECT id FROM usuarios WHERE id = $1 AND activo AND rol = 'ADMINISTRADOR'
       AND alcance_administrador = 'GENERAL' FOR SHARE`, [actorId],
    );
    if (!autorizados.length) throw new ErrorAccesoDenegado('Se requiere el administrador general.');
    if (ciclo.cerradoEn) return { id, cerradoEn: ciclo.cerradoEn };
    if (await tieneSimulacrosPorCerrar(this.bd, id)) {
      throw new ErrorConflicto('Aún hay simulacros del ciclo sin cierre general confirmado.');
    }
    const { rows } = await this.bd.query<{ id: string }>(
      `SELECT u.id::text FROM usuarios u JOIN postulantes_ciclo pc ON pc.postulante_id = u.id
       WHERE pc.ciclo_id = $1 AND pc.desvinculado_en IS NULL AND u.rol = 'POSTULANTE' AND u.activo
       ORDER BY u.id FOR UPDATE OF u`, [id],
    );
    const postulantes = rows.map(fila => fila.id);
    if (postulantes.length && await consultarActivos(this.bd, postulantes)) {
      throw new ErrorConflicto('Hay intentos activos que impiden el cierre del ciclo.');
    }
    await this.bd.query(
      `WITH archivados AS (
         UPDATE usuarios SET activo = false, actualizado_en = now()
         WHERE id = ANY($1::integer[]) RETURNING id
       )
       INSERT INTO auditoria_postulantes (postulante_id, administrador_id, operacion)
       SELECT id, $2, 'ARCHIVADO' FROM archivados`, [postulantes, actorId],
    );
    await this.bd.query('UPDATE postulantes_ciclo SET desvinculado_en = now() WHERE ciclo_id = $1 AND desvinculado_en IS NULL', [id]);
    const { rows: [cerrado] } = await this.bd.query<{ id: string; cerradoEn: Date }>(
      `UPDATE ciclos_academicos SET cerrado_en = now(), cerrado_por = $2
       WHERE id = $1 RETURNING id, cerrado_en AS "cerradoEn"`, [id, actorId],
    );
    return cerrado;
  }
}
