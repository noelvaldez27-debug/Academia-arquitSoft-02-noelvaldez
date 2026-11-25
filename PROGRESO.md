# PROGRESO.md

## Estado actual
- Fase 1 (documentación): terminada. Análisis de sistema actualizado con las decisiones del Sprint 2 y 3 y con el alcance por sede del módulo 1
- Fase 2 (desarrollo): módulos 0 y 1 terminados.
- Sprint 2: implementar y validar los 6 módulos del backend (ver `docs/sprint-2.md`)
- Sprint 3: aplicación web, integración y despliegue en AWS (ver `docs/sprint-3.md`). En pausa

## Módulos
| # | Módulo | Estado |
| --- | --- | --- |
| 0 | Base del proyecto (Dockerfile, docker-compose, .env.example, CI con Jest) | terminado |
| 1 | Gestión de Usuarios | terminado (25 de 25 tareas) |
| 2 | Banco de Preguntas | en curso (SDD confirmada, 6 de 12 tareas) |
| 3 | Rendición de Examen | sin empezar |
| 4 | Procesamiento de Resultados | sin empezar |
| 5 | Ranking y Reportes | sin empezar |
| 6 | Analítica del Estudiante | sin empezar |
| - | Pruebas de carga con k6 (hasta 2,000 usuarios virtuales) | sin empezar, se hace al final del Sprint 2 |
| - | Aplicación web (`frontend/`, React + Tailwind) | Sprint 3, sin empezar |

## Decisiones ya tomadas (no reabrir sin avisar al usuario)
- Nadie se registra solo: las cuentas las crea siempre un administrador (RC09)
- Hay tres roles: postulante, docente y administrador. El administrador tiene dos niveles: el Administrador general (uno solo, con todas las sedes) y los Administradores de sede (varios por sede, que trabajan solo con su sede)
- Las sedes son Hana, Urin y Central. Cada sede tiene sus propios estudiantes y administradores. Las sedes se guardan en una tabla, no en el código (AC05)
- Cada estudiante se registra con nombre, DNI, sede y carrera (RF10 pide rankings por carrera y por sede)
- Postulantes y docentes usan el usuario dni@sofia.edu y su DNI como contraseña inicial, guardada con hash (RF02, RF19, RC09). Los administradores tienen correo y contraseña inicial definidos por quien crea la cuenta (excepción a la regla del DNI)
- Los docentes los registra solo el Administrador general (HU14, RF19, RC09)
- El Administrador general (único) se crea con un script de arranque (seed), usando variables de entorno sin valores de respaldo
- Los usuarios no se borran: se desactivan y se pueden reactivar
- El cambio de contraseña es opcional para todos; los administradores pueden cambiar su correo
- El registro de estudiantes puede ser de uno en uno o con una carga masiva desde Excel (.xlsx), que se procesa en segundo plano (ADR-016). Las tablas se crean con migraciones SQL, sin ORM (ADR-015)
- IA: capa gratuita de Gemini detrás de la interfaz `ServicioIA`; las imágenes se leen con el mismo modelo, sin OCR aparte (ADR-010, ADR-011)
- Archivos: interfaz `AlmacenArchivos`; disco local en el Sprint 2 y Amazon S3 en el despliegue (ADR-012)
- Despliegue en AWS con una instancia EC2 y docker-compose; Kubernetes y los servicios administrados quedan como objetivo de producción (ADR-013)
- Aplicación web con React + Tailwind, en `frontend/`, fuera de `src/modules/` (ADR-014)
- En pruebas automatizadas y de carga se usa el adaptador simulado de `ServicioIA`, nunca la IA real
- Versiones fijadas de servicios de infraestructura en Docker Compose: PostgreSQL 16 (`postgres:16-alpine`), Redis 7 (`redis:7-alpine`), RabbitMQ 3.13 con interfaz de gestión (`rabbitmq:3.13-management-alpine`).
- IA y adjuntos: `ServicioIA` se definió con entrada de texto (`proponer(texto, curso)`); el soporte de adjuntos binarios para imágenes y PDF escaneados (ADR-011) queda pendiente para la especificación del módulo Banco de Preguntas.
- Por ahora solo se trabaja el Sprint 2. El Sprint 3 (aplicación web, despliegue en AWS, adaptador de S3, actualización de C4) queda en pausa hasta que el usuario lo confirme. No iniciar nada de eso por iniciativa propia.
- El administrador de sede puede desactivar y reactivar postulantes de su sede (CA-U11, confirmado por el usuario).
- El administrador general puede crear sedes nuevas sin cambiar código (CA-U14, AC05, confirmado por el usuario).

## Pendiente de confirmar (módulo 1)
Supuestos escritos en `specs/usuarios/spec.md` y `specs/usuarios/tasks.md` que el usuario aún no confirmó. Si una tarea depende de alguno, preguntar antes de implementarla.
- Los docentes los registra solo el Administrador general y no pertenecen a una sede (tarea 7)
- La carrera es texto normalizado, no una lista cerrada (tareas 4 y 6)
- El nombre se guarda en un solo campo (tareas 3 y 4)
- No hay restablecer contraseña olvidada

## Última tarea completada
Módulo 2, tarea 6: Subida DOCX, PDF e imágenes con límite configurable, disco local y envío pendiente transaccional. TypeScript y prueba CA-BP02 aprobados. La activación del consumidor corresponde a la tarea 8.

Tarea 25: GitHub Actions completó la compilación y Jest con cobertura para el commit 9103120 ([ejecución 45526873308](https://github.com/noelvaldez27-debug/Academia-arquitSoft-02-noelvaldez/actions/runs/45526873308)). En local pasaron 314 pruebas en 42 suites, con código de salida 0. Cobertura global local: 92,34 % de sentencias, 85,29 % de ramas, 94,06 % de funciones y 92,87 % de líneas. Jest y CI no tienen mínimos numéricos configurados. El recorrido con Docker está en pruebas/verificar-usuarios-compose.cjs.

## Tarea en curso / pendiente a medias
Ninguna tarea de código en curso.

## Siguiente paso exacto
Módulo 2, tarea 7: Implementar extractores y contrato multimodal de ServicioIA.

## Notas para el siguiente editor
- Tarea 18 completada: `src/modules/usuarios/index.ts` encapsula las capas internas y expone únicamente puertos y contratos públicos: autorización de rutas (`MiddlewareAutenticacion`), tipos de dominio autorizables (`RolUsuario`, `AlcanceAdministrador`), contrato de consulta (`ServicioConsultaUsuarios`, `UsuarioPublicoDTO`, `ConsultarUsuarioUseCase`) y raíz de composición (`UsuariosModule`, `ConfigModuloUsuarios`). Ningún otro módulo puede importar repositorios ni tablas del módulo de usuarios.
- Tarea 17 completada: Casos de uso `ListarSedesUseCase` y `CrearSedeUseCase` con endpoints `GET /api/usuarios/sedes` y `POST /api/usuarios/sedes`. La creación de sedes valida unicidad de nombre en la tabla `sedes` y está restringida exclusivamente al Administrador General (`AlcanceAdministrador.General`).
- Tarea 16 completada: Caso de uso `RegistrarAdministradorSedeUseCase` y endpoint `POST /api/usuarios/administradores-sede`. Crea cuentas con rol `Administrador` y alcance `Sede`. Excepción a la regla del DNI de RC09. Se valida que el correo no esté duplicado y que la sede exista previamente en la tabla de sedes. Solo el administrador general puede invocarlo.
- Tarea 15 completada: Casos de uso `DesactivarUsuarioUseCase` y `ReactivarUsuarioUseCase`. Los endpoints `PATCH /api/usuarios/:id/desactivar` y `PATCH /api/usuarios/:id/reactivar` actualizan el campo `activo` a través de `UsuarioRepository.actualizar`. Como el `MiddlewareAutenticacion` consulta la BD en cada petición, cualquier usuario desactivado pierde el acceso de inmediato (401).
- Tarea 14 completada: Caso de uso `ListarUsuariosUseCase` y endpoint `GET /api/usuarios` paginado (`pagina`, `limite`, `total`). Consultas SQL parametrizadas con LIMIT y OFFSET sobre `PostgresUsuarioRepository.listar`. Si un administrador de sede intenta listar usuarios de otra sede o un rol distinto a Postulante, responde 403 (`ErrorAccesoDenegado`). No expone hashes ni contraseñas. Documentado en OpenAPI con esquema de respuesta paginado.
- Decisiones confirmadas: el administrador de sede puede desactivar y reactivar postulantes de su sede, y el administrador general puede crear sedes nuevas sin cambiar código.
- Tarea 11 completada: Controlador `UsuarioController` en `src/modules/usuarios/presentacion/usuario.controller.ts` y rutas `crearRutasUsuario` en `src/modules/usuarios/presentacion/usuario.routes.ts`. Se documentaron los esquemas y endpoints en `src/compartido/infraestructura/especificacion-openapi.ts` con seguridad `bearerAuth`. El endpoint `/login` responde 401 genérico ante cualquier error y nunca revela credenciales ni hashes (AC04, CA-U05). Se conectó `UsuariosModule` en `src/index.ts` y `src/compartido/infraestructura/servidor.ts`.
- Tarea 10 completada: Clase `MiddlewareAutenticacion` en `src/modules/usuarios/presentacion/autenticacion.middleware.ts` con métodos `autenticar`, `requerirRol` y `requerirAlcanceSede`. Extiende `Express.Request` con `req.usuario` tipado con datos de BD. Si el usuario fue desactivado, responde 401 aunque el JWT no haya expirado; si es administrador de sede, impide gestionar estudiantes de otra sede con 403.
- Tarea 9 completada: Librería JWT elegida: `jsonwebtoken` (^9.0.3) con `@types/jsonwebtoken` (^9.0.10). Motivo de elección: estándar consolidado para APIs Express en Node.js, implementación nativa en JavaScript sin dependencias compiladas C++ (plena compatibilidad con `node:20-alpine`), sin vulnerabilidades altas ni críticas en `npm audit`. Se desacopló mediante el puerto `ServicioToken` en `src/modules/usuarios/aplicacion/servicio-token.port.ts` y se implementó `JsonWebTokenAdapter` en `src/modules/usuarios/infraestructura/jsonwebtoken-token.adapter.ts`. Nueva variable no secreta agregada con valor documentado por defecto: `JWT_DURACION=8h`. Se implementó validación de seguridad para rechazar `JWT_SECRET` faltante o iniciado con `cambiar_` cuando `NODE_ENV=production`.
- Tarea 8 completada: Servicio `SembradorAdministradorGeneral` en `src/modules/usuarios/aplicacion/sembrar-administrador-general.ts` y script de entrada `src/scripts/seed-admin.ts`. Se configuraron las variables de entorno sin respaldo `ADMIN_GENERAL_NOMBRE`, `ADMIN_GENERAL_CORREO` y `ADMIN_GENERAL_PASSWORD` en `.env.example` y en `docker-compose.yml`. Se agregó el comando `npm run seed:admin` en `package.json`. Si alguna variable falta, arroja error explicativo; si ya existe un administrador general, no realiza duplicaciones ni modificaciones (CA-U04).
- Tarea 7 completada: Caso de uso `RegistrarDocenteUseCase` en `src/modules/usuarios/aplicacion/registrar-docente.use-case.ts`. Se valida que el ejecutor sea Administrador General (`AlcanceAdministrador.General`). Si es Administrador de Sede, Docente o Postulante, lanza `ErrorAccesoDenegado`. Los docentes no poseen sede ni carrera según el modelo de dominio. Reutiliza `GeneradorCredenciales` para crear credenciales con hash.
- Tarea 6 completada: Caso de uso `RegistrarEstudianteUseCase` en `src/modules/usuarios/aplicacion/registrar-estudiante.use-case.ts`. Se definieron errores de dominio (`ErrorValidacion`, `ErrorConflicto`, `ErrorAccesoDenegado`, `ErrorNoAutenticado`, `ErrorAutenticacion`, `ErrorNoEncontrado`) en `src/modules/usuarios/dominio/errores.ts`. Se valida que el ejecutor sea Administrador, y en caso de Administrador de Sede se restringe estrictamente a su propia sede (por ID o nombre). La búsqueda de sede es flexible por ID o por nombre. La carrera se normaliza en mayúsculas automáticamente mediante la entidad `Usuario`. Quedó estructurado como operación reutilizable para registro manual y para la carga masiva (tarea 21).
- Tarea 5 completada: Generación automática de credenciales. Librería elegida: `bcryptjs` (^3.0.3) y `@types/bcryptjs` (^2.4.6). Motivo de elección: implementación en JavaScript puro sin dependencias nativas C++ ni binarios dependientes de glibc/musl, garantizando ejecución sin compiladores adicionales en la imagen `node:20-alpine`; cuenta con cero dependencias en producción y cero vulnerabilidades altas o críticas en `npm audit`. Se desacopló mediante el puerto `ServicioHash` en `src/modules/usuarios/aplicacion/servicio-hash.port.ts` y se implementó `BcryptjsHashAdapter` en `src/modules/usuarios/infraestructura/bcryptjs-hash.adapter.ts`.
- Tarea 4 completada: Migraciones `001_crear_tabla_sedes.sql` (siembra de sedes 'Hana', 'Urin' y 'Central') y `002_crear_tabla_usuarios.sql` (restricciones de check para reglas de roles, índice único en DNI no nulo e índice único parcial para garantizar un único administrador general). Implementados `PostgresSedeRepository` y `PostgresUsuarioRepository` con pool simulado sin Docker.
- Tarea 3 completada: Entidades `Usuario` y `Sede`, roles `RolUsuario` (`Postulante`, `Docente`, `Administrador`) y `AlcanceAdministrador` (`General`, `Sede`), y puertos `UsuarioRepository` y `SedeRepository`. Se definieron validaciones de dominio: DNI de 8 dígitos para postulantes y docentes, carrera en mayúsculas normalizada para postulantes, sede obligatoria para postulantes y administradores de sede, docente y administrador general sin sede, cambio de correo exclusivo para administradores, y métodos `desactivar()` y `reactivar()`.
- Tarea 2 completada: Mecanismo de migraciones SQL sin dependencias adicionales (utiliza el cliente `pg` existente). Archivos `.sql` se ubican en `migraciones/`. El runner ejecuta cada migración pendiente dentro de una transacción `BEGIN ... COMMIT` con rollback automático ante errores y registro en `migraciones_control`. Se documentó en `docs/despliegue.md` y se añadió el script `npm run migrar` en `package.json`.
- Tarea 1 completada: Estructura base de `src/modules/usuarios/` con sus cuatro capas (`dominio`, `aplicacion`, `infraestructura`, `presentacion`), la raíz de composición `usuarios.module.ts` y la API pública `index.ts`.
- Pendiente para Banco de Preguntas (ADR-011): el puerto `ServicioIA` solo tiene `proponer` y `recomendar`, sin archivos adjuntos. El ADR-011 dice que las imágenes y los PDF escaneados pasan por `ServicioIA`. Se decide en el módulo Banco de Preguntas si `proponer` recibe un adjunto opcional o si se agrega otro método. No resolverlo ahora.
- Comportamiento de PORT en Docker Compose: Si se cambia PORT en .env a un valor distinto de 3000, el contenedor backend deja de responder peticiones desde el host, ya que docker-compose.yml publica `${PORT}:3000` mientras que Express escucha internamente en `PORT` (`${PORT}`). Mantener `PORT=3000` para el entorno local con Docker Compose. No corregir esto sin consultar al usuario.
- Alcance de `/health`: El endpoint `/health` solo confirma que el servidor HTTP Express levantó y responde; no consulta activamente PostgreSQL, Redis ni RabbitMQ. La salud de la infraestructura la garantizan los healthchecks de Docker Compose definidos en docker-compose.yml. La primera conexión real del backend a PostgreSQL es la tarea 23 de `specs/usuarios/tasks.md`.
- Imagen de Docker: solo contiene `dist/` y las dependencias de producción. `tsc` no copia archivos `.sql` y `ts-node` no está en la imagen, así que las migraciones y el script de arranque se ejecutan con `node` sobre `dist/`.
- Si una tarea contradice `specs/usuarios/spec.md`, detenerse y preguntar al usuario; no modificar la especificación por cuenta propia.
- Workflow de CI (`.github/workflows/ci.yml`):
  - Utiliza Node.js 20 (alineado con la imagen `node:20-alpine` del Dockerfile y `"node": ">=20"` de `package.json`).
  - Utiliza versiones fijas de acciones (`actions/checkout@v4`, `actions/setup-node@v4`).
  - La verificación real se realiza en la pestaña Actions de GitHub tras el push.
- Librerías instaladas:
  - En `dependencies`: `pg` (^8.23.1), `ioredis` (^6.0.0), `amqplib` (^2.4.0), `express` (^5.3.0), `swagger-ui-express` (^5.0.1).
  - En `devDependencies`: `@types/pg` (^8.23.1), `@types/amqplib` (^0.10.8), `@types/express` (^5.0.6), `@types/swagger-ui-express` (^4.1.8), `supertest` (^7.3.2), `@types/supertest` (^7.2.1), `jest`, `ts-jest`, `typescript` (^5.9.3).
- Arquitectura de puertos y adaptadores compartidos (`src/compartido/`):
  - `src/compartido/aplicacion/almacen-archivos.ts` (`AlmacenArchivos`).
  - `src/compartido/aplicacion/servicio-ia.ts` (`ServicioIA`, `PreguntaPropuesta`).
  - `src/compartido/infraestructura/almacen-archivos-local.ts` (`AlmacenArchivosLocal`, `obtenerRutaAlmacenLocalDesdeEnv`).
  - `src/compartido/infraestructura/servicio-ia-simulado.ts` (`ServicioIASimulado`).
- En Codex para Windows, Supertest usa un socket local. Fue necesario ejecutar la suite completa fuera del sandbox para validar las rutas HTTP.
- El `git add` y el `git commit` requieren `BypassSandbox: true` en Antigravity (el sandbox bloquea la escritura en `.git/`). Los demás comandos de lectura funcionan en sandbox normal.
- El proyecto está en `main`, rama activa. `npx tsc --noEmit`, `npm test` y `npm run test:cov` pasan sin errores.
- TypeScript se mantiene en la serie 5 (`^5.9.3`). No actualizar a TypeScript 7+ ya que `ts-jest@29` no lo soporta.
- Nunca crear ni comitear `.env` en el repositorio; cada desarrollador debe crearlo localmente copiando `.env.example`.
