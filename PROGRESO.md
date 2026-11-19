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
Tarea 7 de `specs/base/tasks.md`: implementar el servidor base HTTP con endpoint de salud (`/health`) y Swagger UI montado en `/api-docs` en `src/compartido/infraestructura/servidor.ts`, junto con la especificación OpenAPI tipada como objeto TypeScript en `src/compartido/infraestructura/especificacion-openapi.ts`. Se desacopló la construcción de la app (`crearApp()`) del arranque en `src/index.ts`, el cual lee la variable `PORT` (por defecto 3000) y escucha en `0.0.0.0`. Se agregaron pruebas HTTP de integración con `supertest` y Jest (sin abrir puertos reales fijos), alcanzando 35 pruebas pasando con 100% de cobertura de código y validación estricta en TypeScript (`npx tsc --noEmit`).

## Tarea en curso / pendiente a medias
(ninguna)

## Siguiente paso exacto
Tarea 8 de `specs/base/tasks.md`: implementar los puertos compartidos `ServicioIA` y `AlmacenArchivos` con sus adaptadores simulado (IA) y de disco local (archivos) en `src/compartido/`, según ADR-010 y ADR-012.

## Notas para el siguiente editor
- Librerías instaladas:
  - En `dependencies`: `pg` (^8.23.1), `ioredis` (^6.0.0), `amqplib` (^2.4.0), `express` (^5.3.0), `swagger-ui-express` (^5.0.1).
  - En `devDependencies`: `@types/pg` (^8.23.1), `@types/amqplib` (^0.10.8), `@types/express` (^5.0.6), `@types/swagger-ui-express` (^4.1.8), `supertest` (^7.3.2), `@types/supertest` (^7.2.1), `jest`, `ts-jest`, `typescript` (^5.9.3).
- Arquitectura del servidor: `crearApp()` exporta la instancia de Express sin llamar a `.listen()`, permitiendo pruebas HTTP limpias mediante `supertest(app)`. El arranque se ejecuta exclusivamente desde `src/index.ts`.
- La especificación OpenAPI vive en código TypeScript (`src/compartido/infraestructura/especificacion-openapi.ts`), por lo que se compila limpiamente en `dist/` sin requerir tareas adicionales de copiado en el Dockerfile.
- Pruebas: 35 pruebas pasando con 100% de cobertura. Al ejecutarse en el sandbox de Antigravity en Windows, `supertest` requiere `BypassSandbox: true` porque enlaza un socket de loopback efímero para simular las peticiones HTTP.
- El `git add` y el `git commit` requieren `BypassSandbox: true` en Antigravity (el sandbox bloquea la escritura en `.git/`). Los demás comandos de lectura funcionan en sandbox normal.
- El proyecto está en `main`, rama activa. `npx tsc --noEmit`, `npm test` y `npm run test:cov` pasan sin errores.
- TypeScript se mantiene en la serie 5 (`^5.9.3`). No actualizar a TypeScript 7+ ya que `ts-jest@29` no lo soporta.
- Nunca crear ni comitear `.env` en el repositorio; cada desarrollador debe crearlo localmente copiando `.env.example`.
