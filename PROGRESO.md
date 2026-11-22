# PROGRESO.md

## Estado actual
- Fase 1 (documentación): terminada. Análisis de sistema actualizado con las decisiones del Sprint 2 y 3 y con el alcance por sede del módulo 1
- Fase 2 (desarrollo): módulo 0 terminado; módulo 1 (Gestión de Usuarios) en curso, con especificación y tareas listas y sin código todavía
- Sprint 2: implementar y validar los 6 módulos del backend (ver `docs/sprint-2.md`)
- Sprint 3: aplicación web, integración y despliegue en AWS (ver `docs/sprint-3.md`). En pausa

## Módulos
| # | Módulo | Estado |
| --- | --- | --- |
| 0 | Base del proyecto (Dockerfile, docker-compose, .env.example, CI con Jest) | terminado |
| 1 | Gestión de Usuarios | en curso (tareas 1 y 2 completadas) |
| 2 | Banco de Preguntas | sin empezar |
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

## Pendiente de confirmar (módulo 1)
Supuestos escritos en `specs/usuarios/spec.md` y `specs/usuarios/tasks.md` que el usuario aún no confirmó. Si una tarea depende de alguno, preguntar antes de implementarla.
- Los docentes los registra solo el Administrador general y no pertenecen a una sede (tarea 7)
- El Administrador de sede puede desactivar y reactivar postulantes de su sede (tarea 15)
- El Administrador general puede crear sedes nuevas (tarea 17)
- La carrera es texto normalizado, no una lista cerrada (tareas 4 y 6)
- No hay tope de alumnos por sede (tareas 6 y 21)
- El nombre se guarda en un solo campo (tareas 3 y 4)
- El JWT dura 8 horas, configurable, y la contraseña tiene mínimo 8 caracteres (tareas 9 y 12)
- La carga masiva usa la cola de mensajes (tarea 21 y ADR-016)
- Un DNI existente con nombre distinto en el Excel no se cambia y se informa (tarea 21)
- No hay restablecer contraseña olvidada

## Última tarea completada
Tarea 2 de `specs/usuarios/tasks.md`: mecanismo simple de migraciones SQL versionadas (ADR-015), compartido entre módulos, con archivos .sql numerados en `migraciones/`, tabla de control `migraciones_control` y ejecutor en `src/compartido/infraestructura/migrador.ts` y `src/scripts/migrar.ts`. Se actualizó `Dockerfile` para copiar `migraciones/` a la imagen final y `docs/despliegue.md` documentando la ejecución con `docker compose exec backend node dist/scripts/migrar.js` y `npm run migrar`. 64 pruebas unitarias Jest pasando y verificación de TypeScript sin errores.

## Tarea en curso / pendiente a medias
(ninguna)

## Siguiente paso exacto
Módulo 1: Gestión de Usuarios. Ejecutar la tarea 3 de `specs/usuarios/tasks.md`: crear en `src/modules/usuarios/dominio/` las entidades Usuario (nombre, DNI, correo, rol, activo, sede, carrera) y Sede, los roles (Postulante, Docente, Administrador), el alcance del Administrador (general o de sede) y los contratos de repositorio `usuario-repository.ts` y `sede-repository.ts`.

## Notas para el siguiente editor
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
- Pruebas: 52 pruebas pasando con 100% de cobertura en Stmts, Branch, Funcs y Lines. Al ejecutarse en el sandbox de Antigravity en Windows, `supertest` requiere `BypassSandbox: true` porque enlaza un socket de loopback efímero para simular las peticiones HTTP.
- El `git add` y el `git commit` requieren `BypassSandbox: true` en Antigravity (el sandbox bloquea la escritura en `.git/`). Los demás comandos de lectura funcionan en sandbox normal.
- El proyecto está en `main`, rama activa. `npx tsc --noEmit`, `npm test` y `npm run test:cov` pasan sin errores.
- TypeScript se mantiene en la serie 5 (`^5.9.3`). No actualizar a TypeScript 7+ ya que `ts-jest@29` no lo soporta.
- Nunca crear ni comitear `.env` en el repositorio; cada desarrollador debe crearlo localmente copiando `.env.example`.

