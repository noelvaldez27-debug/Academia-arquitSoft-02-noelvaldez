import type { Pool } from 'pg';
import ExcelJS from 'exceljs';
import type { CredencialesProvisionales } from './credenciales-provisionales';

interface Entrega {
  correo: string;
  referencia: string;
  dni: string;
  tipoPassword: 'ALEATORIA' | 'DNI';
}

export class PostgresEntregaCredenciales {
  constructor(private readonly pool: Pool, private readonly provisionales: CredencialesProvisionales) {}

  async descargar(administradorId: string, sedeId: string | null, id: string, masiva: boolean) {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const { rows } = await cliente.query<Entrega>(
        `DELETE FROM entregas_credenciales_usuarios e
         USING usuarios u, usuarios a
         WHERE u.id = e.usuario_id AND a.id = e.administrador_id
           AND a.id = $1::integer AND a.activo AND a.rol = 'ADMINISTRADOR'
           AND (a.alcance_administrador = 'GENERAL' OR
             (a.alcance_administrador = 'SEDE' AND a.sede_id = $2::integer AND u.sede_id = a.sede_id))
           AND u.activo AND u.version_sesion = e.version_sesion AND e.vence > now()
           AND ${masiva
             ? "e.carga_id = $3 AND EXISTS (SELECT 1 FROM cargas_masivas c WHERE c.id = e.carga_id AND c.estado = 'COMPLETADA')"
             : 'e.carga_id IS NULL AND e.usuario_id = $3::integer'}
         RETURNING u.correo, u.dni, e.referencia, e.tipo_password AS "tipoPassword"`,
        [administradorId, sedeId, id],
      );
      if (!rows.length) {
        await cliente.query('COMMIT');
        return null;
      }
      const libro = new ExcelJS.Workbook();
      const hoja = libro.addWorksheet('Credenciales provisionales');
      hoja.addRow(['Correo', 'Contraseña provisional']);
      for (const fila of rows) hoja.addRow([fila.correo,
        fila.tipoPassword === 'DNI' ? fila.dni : this.provisionales.derivar(fila.referencia)]);
      const archivo = Buffer.from(await libro.xlsx.writeBuffer());
      await cliente.query('COMMIT');
      return archivo;
    } catch (error) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      cliente.release();
    }
  }
}
