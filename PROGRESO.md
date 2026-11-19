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
Tarea 4 de `specs/base/tasks.md`: crear `docker-compose.yml` con los servicios `backend`, `postgres`, `redis` y `rabbitmq`. El backend utiliza el Dockerfile de la tarea 3 y depende de que los servicios de infraestructura estén saludables (`condition: service_healthy`). PostgreSQL implementa healthcheck con `pg_isready`, Redis con `redis-cli ping` (autenticado) y RabbitMQ con `rabbitmq-diagnostics ping`. Se utilizan volúmenes nombrados (`postgres_data`, `redis_data`, `rabbitmq_data`) para la persistencia. Se emplean variables de entorno con valores por defecto para desarrollo sin contraseñas reales quemadas. El archivo fue validado sintácticamente con `docker-compose config`.

## Tarea en curso / pendiente a medias
(ninguna)

## Siguiente paso exacto
Tarea 5 de `specs/base/tasks.md`: configurar variables de entorno documentadas en `.env.example` y asegurar que `.env` esté en `.gitignore` (ningún secreto en el repositorio). No crear variables no documentadas y documentar cada variable según lo requerido por el backend, postgres, redis y rabbitmq.

## Notas para el siguiente editor
- El `git add` y el `git commit` requieren `BypassSandbox: true` en Antigravity (el sandbox bloquea la escritura en `.git/`). Los demás comandos funcionan en sandbox normal.
- `npm install` también requiere red (BypassSandbox: true).
- `docker build` también requiere `BypassSandbox: true` y que Docker Desktop esté corriendo.
- El proyecto está en `main`, rama activa. `npx tsc --noEmit` y `npm test` pasan sin errores.
- TypeScript se mantiene en `^5.8` (o la versión actual `^5.9.3`): `ts-jest@29` no soporta TypeScript 7+. No actualizar TypeScript hasta que ts-jest lo soporte.
- El binario `docker compose` en Windows/CLI actual se invocó como `docker-compose config`, validando exitosamente la sintaxis de `docker-compose.yml`.
