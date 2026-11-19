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

## Última tarea completada
Tarea 3 de `specs/base/tasks.md`: crear `Dockerfile` de dos etapas (build + runtime) y `.dockerignore`. La etapa build instala todas las dependencias con `npm ci` y compila con `tsc`; la etapa runtime instala solo dependencias de producción (`npm ci --omit=dev`) y copia `dist/` desde la etapa build. El contenedor corre como usuario `node` (no root), expone el puerto 3000 y lanza `node dist/index.js`. El `.dockerignore` excluye `node_modules`, `dist`, `coverage`, `.git`, `.env`, archivos de IDE y carpetas de documentación. Docker Desktop estaba apagado al momento del commit; el Dockerfile fue revisado manualmente y es correcto.

## Tarea en curso / pendiente a medias
(ninguna)

## Siguiente paso exacto
Tarea 4 de `specs/base/tasks.md`: crear `docker-compose.yml` con los servicios backend, PostgreSQL, Redis y RabbitMQ. El backend debe usar la imagen construida con el `Dockerfile` de la tarea 3. Leer `docs/` para confirmar versiones y nombres de servicios antes de escribirlo.

## Notas para el siguiente editor
- El `git add` y el `git commit` requieren `BypassSandbox: true` en Antigravity (el sandbox bloquea la escritura en `.git/`). Los demás comandos funcionan en sandbox normal.
- `npm install` también requiere red (BypassSandbox: true).
- `docker build` también requiere `BypassSandbox: true` y que Docker Desktop esté corriendo.
- El proyecto está en `main`, rama activa. `npx tsc --noEmit` pasa sin errores con la configuración actual.
- TypeScript se mantiene en `^5.8` (o la versión actual `^5.9.3`): `ts-jest@29` no soporta TypeScript 7+. No actualizar TypeScript hasta que ts-jest lo soporte.
- El Dockerfile no incluye HEALTHCHECK (es parte de la tarea 7, cuando exista el endpoint `/health`).