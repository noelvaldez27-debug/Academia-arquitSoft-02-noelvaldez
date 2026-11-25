import { BancoPreguntasModule } from './modules/banco-preguntas';
import { AlmacenArchivosLocal, crearApp, crearPoolPostgres } from './compartido/infraestructura';
import { UsuariosModule } from './modules/usuarios';

const pool = crearPoolPostgres();
const usuariosModule = new UsuariosModule({ pool });

void usuariosModule.consumidorCargaMasiva.ejecutar();

const almacen = new AlmacenArchivosLocal(process.env.ALMACEN_LOCAL_PATH?.trim() || './uploads');
const limiteSeparataMb = Number(process.env.SEPARATA_MAX_MB ?? '20');
if (!Number.isFinite(limiteSeparataMb) || limiteSeparataMb <= 0) {
  throw new Error('SEPARATA_MAX_MB debe ser positivo.');
}
const bancoPreguntas = new BancoPreguntasModule(pool, usuariosModule.middlewareAutenticacion, almacen, Math.floor(limiteSeparataMb * 1024 * 1024));
const app = crearApp({ rutasUsuarios: usuariosModule.router, rutasBancoPreguntas: bancoPreguntas.rutas });
const port = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Servidor EVALUA-NET escuchando en http://${host}:${port}`);
  console.log(`Documentación Swagger disponible en http://${host}:${port}/api-docs`);
});
