import { ErrorBancoPreguntas } from '../dominio/errores';
import { Pool } from 'pg';
import { ContenidoPregunta } from '../dominio/pregunta';
import { PreguntaPropuesta } from '../dominio/pregunta-propuesta';
import { AutorizacionExterna, Separata } from '../dominio/separata';
import { SeparataRepository } from '../dominio/separata-repository';
import { transaccionBanco } from './transaccion-banco';

export class PostgresSeparataRepository implements SeparataRepository {
  constructor(private readonly pool: Pool) {}

  async buscar(id: string): Promise<Separata | null> {
    const { rows } = await this.pool.query<Separata>(
      `SELECT id, docente_id AS "docenteId", curso_id AS "cursoId", archivo, mime, estado, texto, motivo
       FROM separatas WHERE id = $1`, [id],
    );
    return rows[0] ?? null;
  }

  async guardar(separata: Separata, publicar = false): Promise<void> {
    await transaccionBanco(this.pool, async bd => {
      await bd.query(
        `INSERT INTO separatas (id, docente_id, curso_id, archivo, mime, estado, texto, motivo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE
         SET estado = EXCLUDED.estado, texto = EXCLUDED.texto, motivo = EXCLUDED.motivo`,
        [separata.id, separata.docenteId, separata.cursoId, separata.archivo, separata.mime,
          separata.estado, separata.texto, separata.motivo],
      );
      if (publicar) await bd.query(
        `INSERT INTO envios_separata (separata_id) VALUES ($1)
         ON CONFLICT (separata_id) DO UPDATE SET publicado = false`,
        [separata.id],
      );
    });
  }

  async autorizacion(id: string): Promise<AutorizacionExterna | null> {
    const { rows } = await this.pool.query<AutorizacionExterna>(
      `SELECT separata_id AS "separataId", autorizador_id AS "autorizadorId", fecha, estado, alcance
       FROM autorizaciones_separata WHERE separata_id = $1 ORDER BY id DESC LIMIT 1`, [id],
    );
    return rows[0] ?? null;
  }

  async guardarAutorizacion(autorizacion: AutorizacionExterna): Promise<void> {
    await transaccionBanco(this.pool, async bd => {
      await bd.query(
        `INSERT INTO autorizaciones_separata (separata_id, autorizador_id, fecha, estado, alcance)
         VALUES ($1, $2, $3, $4, $5)`,
        [autorizacion.separataId, autorizacion.autorizadorId, autorizacion.fecha, autorizacion.estado, autorizacion.alcance],
      );
      if (autorizacion.estado === 'AUTORIZADA') {
        await bd.query(
          `INSERT INTO envios_separata (separata_id) VALUES ($1)
           ON CONFLICT (separata_id) DO UPDATE SET publicado = false`,
          [autorizacion.separataId],
        );
      }
    });
  }

  async revisarPropuesta(
    id: string,
    cambiar: (propuesta: PreguntaPropuesta, docenteId: string) => PreguntaPropuesta,
  ): Promise<PreguntaPropuesta> {
    return transaccionBanco(this.pool, async bd => {
      type Fila = Pick<PreguntaPropuesta, 'id' | 'separataId' | 'estado'> & {
        contenido: ContenidoPregunta; docenteId: string; cursoId: string;
      };
      const { rows } = await bd.query<Fila>(
        `SELECT p.id, p.separata_id AS "separataId", p.estado, p.contenido,
                s.docente_id AS "docenteId", s.curso_id AS "cursoId"
         FROM propuestas_banco p JOIN separatas s ON s.id = p.separata_id
         WHERE p.id = $1 FOR UPDATE OF p`, [id],
      );
      if (!rows[0]) throw new ErrorBancoPreguntas('no-encontrado', 'Propuesta no encontrada.');
      const { contenido, docenteId, cursoId, ...actual } = rows[0];
      const propuesta = cambiar({ ...actual, ...contenido }, docenteId);
      const { id: propuestaId, separataId, estado, ...nuevoContenido } = propuesta;
      await bd.query('UPDATE propuestas_banco SET estado = $2, contenido = $3 WHERE id = $1',
        [propuestaId, estado, JSON.stringify(nuevoContenido)]);
      if (estado === 'APROBADA') {
        await bd.query(
          `INSERT INTO preguntas_banco (id, curso_id, contenido, habilitada, propuesta_id)
           VALUES ('propuesta-' || $1, $2, $3, true, $1)
           ON CONFLICT (propuesta_id) DO UPDATE SET contenido = EXCLUDED.contenido, habilitada = true`,
          [propuestaId, cursoId, JSON.stringify(nuevoContenido)],
        );
      } else {
        await bd.query('UPDATE preguntas_banco SET habilitada = false WHERE propuesta_id = $1', [propuestaId]);
      }
      return propuesta;
    });
  }

  async listarPropuestas(id: string): Promise<PreguntaPropuesta[]> {
    type Fila = Omit<PreguntaPropuesta, keyof ContenidoPregunta> & { contenido: ContenidoPregunta };
    const { rows } = await this.pool.query<Fila>(
      'SELECT id, separata_id AS "separataId", estado, contenido FROM propuestas_banco WHERE separata_id = $1 ORDER BY id',
      [id],
    );
    return rows.map(({ contenido, ...fila }) => ({ ...fila, ...contenido }));
  }

  async guardarPropuestas(separata: Separata, propuestas: PreguntaPropuesta[]): Promise<void> {
    await transaccionBanco(this.pool, async bd => {
      const { rowCount } = await bd.query(
        `UPDATE separatas SET estado = 'PREGUNTAS_PROPUESTAS' WHERE id = $1 AND estado = 'TEXTO_EXTRAIDO'`,
        [separata.id],
      );
      if (!rowCount) return;
      for (const { id, separataId, estado, ...contenido } of propuestas) {
        await bd.query('INSERT INTO propuestas_banco VALUES ($1, $2, $3, $4)',
          [id, separataId, JSON.stringify(contenido), estado]);
      }
    });
  }
}
