import { crearPoolPostgres, cerrarPoolPostgres } from '../compartido/infraestructura/conexion-postgres';
import { PostgresUsuarioRepository } from '../modules/usuarios/infraestructura/postgres-usuario-repository';
import { BcryptjsHashAdapter } from '../modules/usuarios/infraestructura/bcryptjs-hash.adapter';
import { SembradorAdministradorGeneral } from '../modules/usuarios/aplicacion/sembrar-administrador-general';

/**
 * Script de arranque (seed) que crea el Administrador General único (CA-U04, RF25).
 * Se ejecuta compilado en dist/ con: node dist/scripts/seed-admin.js
 */
export async function ejecutarSembradoAdmin(): Promise<void> {
  const pool = crearPoolPostgres();
  const usuarioRepo = new PostgresUsuarioRepository(pool);
  const hashAdapter = new BcryptjsHashAdapter();
  const sembrador = new SembradorAdministradorGeneral(usuarioRepo, hashAdapter);

  try {
    console.log('Iniciando script de creación de Administrador General inicial...');
    const resultado = await sembrador.sembrar({
      nombre: process.env.ADMIN_GENERAL_NOMBRE,
      correo: process.env.ADMIN_GENERAL_CORREO,
      password: process.env.ADMIN_GENERAL_PASSWORD,
    });

    console.log(resultado.mensaje);
  } catch (error) {
    console.error('Error al sembrar administrador general:', (error as Error).message);
    process.exitCode = 1;
    throw error;
  } finally {
    await cerrarPoolPostgres(pool);
  }
}

if (require.main === module) {
  ejecutarSembradoAdmin().catch(() => {
    process.exit(1);
  });
}
