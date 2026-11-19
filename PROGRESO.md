# PROGRESO.md

## Estado actual
- Fase 1 (documentación): terminada. Análisis de sistema actualizado con las decisiones del Sprint 2 y 3
- Fase 2 (desarrollo): especificaciones del módulo 0 y de Usuarios listas; falta escribir el código
- Sprint 2: implementar y validar los 6 módulos del backend (ver `docs/sprint-2.md`)
- Sprint 3: aplicación web, integración y despliegue en AWS (ver `docs/sprint-3.md`)

## Módulos
| # | Módulo | Estado |
| --- | --- | --- |
| 0 | Base del proyecto (Dockerfile, docker-compose, .env.example, CI con Jest) | en curso |
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

## Última tarea completada
Tarea 6 de `specs/base/tasks.md`: crear las conexiones base a PostgreSQL (`pg`), Redis (`ioredis`) y RabbitMQ (`amqplib`) en `src/compartido/infraestructura/` con tipado estricto, funciones para crear y cerrar conexiones de forma diferida (sin abrirse al importar), validación estricta de variables de entorno requeridas sin fallbacks y con mensajes de error explícitos. Se completaron 29 pruebas unitarias en Jest con mocks (sin necesidad de levantar Docker ni servicios reales) alcanzando 100% de cobertura de código. Se actualizó `.env.example` documentando las variables del backend (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_HOST`, `RABBITMQ_HOST`) para permitir la ejecución local fuera de Docker, validado con `docker-compose --env-file .env.example config`.

## Tarea en curso / pendiente a medias
(ninguna)

## Siguiente paso exacto
Tarea 7 de `specs/base/tasks.md`: implementar el servidor base HTTP con endpoint de salud (`/health`) y Swagger montado en `/api-docs` en `src/compartido/infraestructura/` y su punto de entrada.

## Notas para el siguiente editor
- Librerías instaladas: `pg` (^8.23.1), `ioredis` (^6.0.0) y `amqplib` (^2.4.0) como `dependencies`; `@types/pg` y `@types/amqplib` como `devDependencies`. `ioredis` provee sus propios tipos nativos, por lo que no se requiere `@types/ioredis`.
- Las funciones de conexión leen únicamente las variables enviadas por `docker-compose.yml`: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD` y `RABBITMQ_VHOST`. Si falta alguna, se lanza un `Error` descriptivo.
- El `git add` y el `git commit` requieren `BypassSandbox: true` en Antigravity (el sandbox bloquea la escritura en `.git/`). Los demás comandos funcionan en sandbox normal.
- `npm install` también requiere red (BypassSandbox: true).
- `docker build` también requiere `BypassSandbox: true` y que Docker Desktop esté corriendo.
- El proyecto está en `main`, rama activa. `npx tsc --noEmit`, `npm test` (29 pruebas pasando) y `npm run test:cov` (100% de cobertura) pasan sin errores.
- TypeScript se mantiene en `^5.8` (o la versión actual `^5.9.3`): `ts-jest@29` no soporta TypeScript 7+. No actualizar TypeScript hasta que ts-jest lo soporte.
- El binario `docker compose` en Windows/CLI actual se invocó como `docker-compose config` y `docker-compose --env-file .env.example config`, validando exitosamente la sintaxis de `docker-compose.yml` con `.env.example`.
- Nunca crear ni comitear `.env` en el repositorio; cada desarrollador debe crearlo localmente copiando `.env.example`.
