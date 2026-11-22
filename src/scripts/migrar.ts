import path from 'path';
import { crearPoolPostgres, cerrarPoolPostgres } from '../compartido/infraestructura/conexion-postgres';
import { MigradorSql } from '../compartido/infraestructura/migrador';

export async function ejecutarMigraciones(rutaCustom?: string): Promise<void> {
  const pool = crearPoolPostgres();
  const migrador = new MigradorSql(pool);

  try {
    console.log('Iniciando proceso de migraciones SQL...');
    const rutaMigraciones =
      rutaCustom ||
      process.env.RUTA_MIGRACIONES ||
      path.resolve(process.cwd(), 'migraciones');
    console.log(`Buscando archivos .sql en: ${rutaMigraciones}`);

    const resultado = await migrador.ejecutar({ rutaMigraciones });

    if (resultado.aplicadas.length === 0) {
      console.log('No hay migraciones pendientes. Base de datos al día.');
    } else {
      console.log(`Se aplicaron ${resultado.aplicadas.length} migraciones exitosamente:`);
      for (const nombre of resultado.aplicadas) {
        console.log(` - ${nombre}`);
      }
    }
  } catch (error) {
    console.error('Fallo en la ejecución de migraciones:', (error as Error).message);
    process.exitCode = 1;
    throw error;
  } finally {
    await cerrarPoolPostgres(pool);
  }
}

if (require.main === module) {
  ejecutarMigraciones().catch(() => {
    process.exit(1);
  });
}
