# PROGRESO.md

## Estado actual
- Fase 1 (documentación): terminada. Análisis de sistema actualizado con las decisiones del Sprint 2 y 3 y con el alcance por sede del módulo 1
- Fase 2 (desarrollo): módulos 0 a 5 terminados. Módulo 6 en implementación.
- Sprint 2: implementar y validar los 6 módulos del backend (ver `docs/sprint-2.md`)
- Sprint 3: aplicación web, integración y despliegue en AWS (ver `docs/sprint-3.md`). En pausa

## Módulos
| # | Módulo | Estado |
| --- | --- | --- |
| 0 | Base del proyecto (Dockerfile, docker-compose, .env.example, CI con Jest) | terminado |
| 1 | Gestión de Usuarios | terminado (25 de 25 tareas) |
| 2 | Banco de Preguntas | terminado (12 de 12 tareas) |
| 3 | Rendición de Examen | terminado (10 de 10 tareas) |
| 4 | Procesamiento de Resultados | terminado (9 de 9 tareas) |
| 5 | Ranking y Reportes | terminado (9 de 9 tareas) |
| 6 | Analítica del Estudiante | en curso (4 de 8 tareas) |
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
Módulo 6, tarea 4 completada. Historial cronológico y porcentajes ponderados con datos definitivos. Pasaron las dos pruebas específicas. La tarea 3 pasó 419 pruebas en 81 suites tras compilar.

Módulo 6, tarea 2 completada. Aprobadas las reglas de desempeño, RF12, RF13, permisos, actualización y persistencia de recomendaciones.

Módulo 6, tarea 1 completada. El borrador en specs/analitica/spec.md traza RF09, RF11, RF12 y RF13 y registra fuentes, criterios de aceptación y decisiones pendientes. La regresión local pasó con 413 pruebas en 77 suites al ejecutar Jest con acceso a sockets locales. No se cambió el backend.

Módulo 5, tarea 9 completada. GitHub Actions compiló con Node.js 20 y ejecutó Jest con cobertura para `5458167`. La validación local registró 413 pruebas en 77 suites, 91,86 % de líneas y 78,74 % de ramas del módulo, y 89,19 % de líneas y 83,22 % de ramas globales. La [SDD](specs/ranking-reportes/spec.md) conserva las decisiones aprobadas, los ajustes en los módulos anteriores, la limitación de inscripciones y la evidencia reproducible de Compose. [Ejecución 45663589106](https://github.com/noelvaldez27-debug/Academia-arquitSoft-02-noelvaldez/actions/runs/45663589106)

Módulo 5, tarea 8 completada. TypeScript y Jest aprobaron 413 pruebas en 77 suites. Cobertura del módulo de 91,86 % de líneas y 78,74 % de ramas, global de 89,19 % y 83,22 %. Docker Compose verificó el cierre concurrente, el ranking y Excel, la migración de datos existentes y la recuperación de RabbitMQ. Las evidencias y mediciones están en `specs/ranking-reportes/spec.md` y el recorrido está en `pruebas/verificar-ranking-compose.cjs`.

Módulo 5, tarea 7 completada. Reportes administrativos de participación, resultados y méritos en JSON y Excel. El docente consulta agregados de cursos asignados. Se comprobaron filtros, separación por sede y equivalencia de filas en Excel. Pasaron 411 pruebas en 75 suites.

Módulo 5, tarea 6 completada. Las rutas de ranking propio y administrativo consultan la proyección y aplican la restricción por sede. OpenAPI documenta ambas. TypeScript compiló y pasaron 410 pruebas en 74 suites.

Módulo 5, tarea 5 completada en código y Jest. El worker compara el estado persistido con la proyección, publica en RabbitMQ y reconstruye en segundo plano con confirmación posterior a persistencia. Pasaron 409 pruebas en 73 suites. El motor Linux de Docker Desktop siguió sin arrancar tras el intento por CLI.

Módulo 5, tarea 4 completada en código y Jest. La proyección se persiste por simulacro con reemplazo transaccional y bloqueo por simulacro. Consume contratos paginados y conserva el puntaje definitivo y las dimensiones históricas. Pasaron 408 pruebas en 72 suites, con 88,29 % de líneas y 83,83 % de ramas globales.

Módulo 5, subtarea 4c completada. Banco permite asignar o retirar docentes por curso como administrador general y expone la consulta interna de cursos asignados. TypeScript compiló y Jest aprobó 407 pruebas en 71 suites.

Módulo 5, subtarea 4b completada en código y Jest. Rendición registra el cierre general, coordina nuevos intentos mediante bloqueos transaccionales de PostgreSQL, conserva las reanudaciones y confirma el cierre tras verificar las calificaciones por contrato público. Pasaron 406 pruebas en 70 suites, con 89,06 % de líneas y 83,98 % de ramas globales. Falta verificar la concurrencia en PostgreSQL real.

Módulo 5, subtarea 4a completada. Usuarios exige condición en altas individuales y masivas y permite cambiarla por rol y sede. Rendición conserva la instantánea al iniciar el intento. TypeScript compiló y Jest aprobó 404 pruebas en 69 suites, con 90,12 % de líneas y 84,65 % de ramas globales.

Módulo 5, tarea 3 completada. Se implementaron puestos de competición, orden estable y filtros de carrera y sede. Jest aprobó 400 pruebas en 68 suites, con 100 % de líneas y ramas en el dominio incorporado (9/9 y 11/11), y 90,51 % de líneas y 84,74 % de ramas en el proyecto.

Módulo 5, tarea 2 completada. Se registraron las reglas aprobadas y las fuentes ausentes en la SDD.

Módulo 5, tarea 1 completada. Se documentaron el alcance trazable, los contratos de integración, los criterios de aceptación y las decisiones pendientes en `specs/ranking-reportes/spec.md`.

Regresión local del borrador con `npm.cmd run test:cov -- --runInBand`: 395 pruebas en 67 suites, 90,47 % de líneas y 84,60 % de ramas. Se ejecutó con acceso a localhost para Supertest. La validación de Ranking y Reportes con Docker Compose corresponde a la tarea 8.

Módulo 4, tarea 9 completada. GitHub Actions compiló con Node.js 20 y ejecutó Jest con cobertura para `2ebedd2`. La validación local aprobó 395 pruebas en 67 suites, incluidas 13 pruebas de Resultados. El módulo alcanzó 82,39 % de líneas (117/142) y 94,44 % de ramas (68/72). Jest reportó 90,47 % de líneas y 84,60 % de ramas para el proyecto completo. [Ejecución 45541070460](https://github.com/noelvaldez27-debug/Academia-arquitSoft-02-noelvaldez/actions/runs/45541070460)

En Docker Compose aislado, el recorrido normal registró 1,124 segundos desde el cierre hasta la primera lectura exitosa por sondeo, con PostgreSQL, Redis y RabbitMQ y sin inyectar duplicados durante esa medición. Fue una medición local de un solo flujo. El recorrido separado de duplicados conservó una sola calificación. La API protegió resultados ajenos y devolvió estado pendiente durante la caída de RabbitMQ. Al restaurar el broker, el evento pendiente llegó al worker y se obtuvo la calificación esperada. Las evidencias y el recorrido están en `specs/resultados/spec.md` y `pruebas/verificar-resultados-compose.cjs`.

Módulo 3, tarea 10 completada. GitHub Actions compiló con Node.js 20 y ejecutó Jest con cobertura para `ca81dfe`. En la validación local pasaron 381 pruebas en 62 suites, incluidas 18 de Rendición y 48 de Banco de Preguntas. Rendición alcanzó 93,26 % de líneas (249/267) y 91,67 % de ramas (77/84). Jest reportó 91,34 % de líneas y 83,94 % de ramas para el proyecto completo. [Ejecución 45536622028](https://github.com/noelvaldez27-debug/Academia-arquitSoft-02-noelvaldez/actions/runs/45536622028)

La integración de CA-RE01 a CA-RE06 pasó con PostgreSQL, Redis y RabbitMQ. Durante la caída de RabbitMQ, dos cierres conservaron sus eventos en la bandeja de salida. Tras restablecer el broker, ambos mensajes llegaron a la cola y la bandeja se vació. El recorrido reproducible está en `pruebas/verificar-rendicion-compose.cjs` y sus comandos en `docs/despliegue.md`.

Módulo 2, tarea 12: GitHub Actions compiló con Node.js 20 y ejecutó Jest con cobertura correctamente para e3210ec ([ejecución 45532258705](https://github.com/noelvaldez27-debug/Academia-arquitSoft-02-noelvaldez/actions/runs/45532258705)). La validación local registró 48 pruebas específicas en 13 suites y 363 pruebas generales en 56 suites, con código de salida 0. Cobertura local del módulo: 91,93 % de líneas y 85,78 % de ramas. Cobertura global local: 91,84 % de líneas y 84,09 % de ramas. El recorrido con PostgreSQL, RabbitMQ e IA simulada está en pruebas/verificar-banco-compose.cjs.

Tarea 25: GitHub Actions completó la compilación y Jest con cobertura para el commit 9103120 ([ejecución 45526873308](https://github.com/noelvaldez27-debug/Academia-arquitSoft-02-noelvaldez/actions/runs/45526873308)). En local pasaron 314 pruebas en 42 suites, con código de salida 0. Cobertura global local: 92,34 % de sentencias, 85,29 % de ramas, 94,06 % de funciones y 92,87 % de líneas. Jest y CI no tienen mínimos numéricos configurados. El recorrido con Docker está en pruebas/verificar-usuarios-compose.cjs.

## Tarea en curso / pendiente a medias
Tarea 5 pendiente. La validación de PostgreSQL real se realizará en la tarea 8.

## Siguiente paso exacto
Implementar la tarea 5 con selección de prioridades y persistencia de recomendaciones.

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
- Banco de Preguntas (ADR-011): ServicioIA incorpora leerAdjunto para JPEG, PNG y PDF. Gemini requiere activación expresa y autorización persistida por separata. Las pruebas usan el proveedor y el transporte simulados.
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
