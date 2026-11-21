# PROGRESO.md

## Estado actual
- Fase 1 (documentación): terminada. Análisis de sistema actualizado con las decisiones del Sprint 2 y 3
- Fase 2 (desarrollo): especificaciones del módulo 0 y de Usuarios listas; falta escribir el código
- Sprint 2: implementar y validar los 6 módulos del backend (ver `docs/sprint-2.md`)
- Sprint 3: aplicación web, integración y despliegue en AWS (ver `docs/sprint-3.md`)

## Módulos
| # | Módulo | Estado |
| --- | --- | --- |
| 0 | Base del proyecto (Dockerfile, docker-compose, .env.example, CI con Jest) | terminado |
| 1 | Gestión de Usuarios | sin empezar |
| 2 | Banco de Preguntas | sin empezar |
| 3 | Rendición de Examen | sin empezar |
| 4 | Procesamiento de Resultados | sin empezar |
| 5 | Ranking y Reportes | sin empezar |
| 6 | Analítica del Estudiante | sin empezar |
| - | Pruebas de carga con k6 (hasta 2,000 usuarios virtuales) | sin empezar, se hace al final del Sprint 2 |
| - | Aplicación web (`frontend/`, React + Tailwind) | Sprint 3, sin empezar |

## Decisiones ya tomadas (no reabrir sin avisar al usuario)
- Los docentes los registra el Administrador, con el mismo formato de credenciales que los postulantes (usuario dni@sofia.edu, contraseña inicial igual al DNI), sin autoregistro (HU14, RF19, RC09)
- El primer Administrador se crea con un script de arranque (seed), usando variables de entorno
- IA: capa gratuita de Gemini detrás de la interfaz `ServicioIA`; las imágenes se leen con el mismo modelo, sin OCR aparte (ADR-010, ADR-011)
- Archivos: interfaz `AlmacenArchivos`; disco local en el Sprint 2 y Amazon S3 en el despliegue (ADR-012)
- Despliegue en AWS con una instancia EC2 y docker-compose; Kubernetes y los servicios administrados quedan como objetivo de producción (ADR-013)
- Aplicación web con React + Tailwind, en `frontend/`, fuera de `src/modules/` (ADR-014)
- En pruebas automatizadas y de carga se usa el adaptador simulado de `ServicioIA`, nunca la IA real
- Versiones fijadas de servicios de infraestructura en Docker Compose: PostgreSQL 16 (`postgres:16-alpine`), Redis 7 (`redis:7-alpine`), RabbitMQ 3.13 con interfaz de gestión (`rabbitmq:3.13-management-alpine`).
- IA y adjuntos: `ServicioIA` se definió con entrada de texto (`proponer(texto, curso)`); el soporte de adjuntos binarios para imágenes y PDF escaneados (ADR-011) queda pendiente para la especificación del módulo Banco de Preguntas.
- Por ahora solo se trabaja el Sprint 2. El Sprint 3 (aplicación web, despliegue en AWS, adaptador de S3, actualización de C4) queda en pausa hasta que el usuario lo confirme. No iniciar nada de eso por iniciativa propia.

## Última tarea completada
Tarea 11 de `specs/base/tasks.md`: verificar que `docker compose up` levanta todo sin configuración manual y que `/health` responde. Se ejecutó `docker compose up -d --build`, levantando los 4 servicios (`postgres`, `redis` y `rabbitmq` en estado healthy, y `backend` en Up). Se verificó respuesta HTTP 200 en `/health` y `/api-docs/`, ejecución como usuario `node` y permisos de escritura en el volumen montado `/app/uploads`. El Módulo 0 (Base del proyecto) queda formalmente completado.

## Tarea en curso / pendiente a medias
(ninguna)

## Siguiente paso exacto
Módulo 1: Gestión de Usuarios. Resolver con el usuario los puntos de "Pendiente de confirmar" en `specs/usuarios/spec.md` antes de iniciar la implementación (no empezar tareas ni escribir código del módulo 1 sin confirmación previa).

## Notas para el siguiente editor
- Pendiente para Banco de Preguntas (ADR-011): el puerto `ServicioIA` solo tiene `proponer` y `recomendar`, sin archivos adjuntos. El ADR-011 dice que las imágenes y los PDF escaneados pasan por `ServicioIA`. Se decide en el módulo Banco de Preguntas si `proponer` recibe un adjunto opcional o si se agrega otro método. No resolverlo ahora.
- Comportamiento de PORT en Docker Compose: Si se cambia PORT en .env a un valor distinto de 3000, el contenedor backend deja de responder peticiones desde el host, ya que docker-compose.yml publica `${PORT}:3000` mientras que Express escucha internamente en `PORT` (`${PORT}`). Mantener `PORT=3000` para el entorno local con Docker Compose. No corregir esto sin consultar al usuario.
- Alcance de `/health`: El endpoint `/health` solo confirma que el servidor HTTP Express levantó y responde; no consulta activamente PostgreSQL, Redis ni RabbitMQ. La salud de la infraestructura la garantizan los healthchecks de Docker Compose definidos en docker-compose.yml.
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
