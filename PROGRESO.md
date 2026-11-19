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
- IA y adjuntos: `ServicioIA` se definió con entrada de texto (`proponer(texto, curso)`); el soporte de adjuntos binarios para imágenes y PDF escaneados (ADR-011) queda pendiente para la especificación del módulo Banco de Preguntas.

## Última tarea completada
Tarea 9 de `specs/base/tasks.md`: configurar el workflow de GitHub Actions en `.github/workflows/ci.yml`. Se dispara con `push` y `pull_request` hacia la rama `main`, con permisos explícitos `permissions: contents: read` a nivel de workflow, usando Node.js 20 con caché de npm (`actions/setup-node@v4`), `actions/checkout@v4`, instalación limpia con `npm ci`, compilación (`npm run build`) y ejecución de pruebas con reporte de cobertura (`npm run test:cov`), sin pasos de Docker ni servicios externos adicionales.

## Tarea en curso / pendiente a medias
(ninguna)

## Siguiente paso exacto
Tarea 10 de `specs/base/tasks.md`: crear `docs/despliegue.md` con el procedimiento para levantar el proyecto con `docker compose up`.

## Notas para el siguiente editor
- Pendiente para Banco de Preguntas (ADR-011): el puerto `ServicioIA` solo tiene `proponer` y `recomendar`, sin archivos adjuntos. El ADR-011 dice que las imágenes y los PDF escaneados pasan por `ServicioIA`. Se decide en el módulo Banco de Preguntas si `proponer` recibe un adjunto opcional o si se agrega otro método. No resolverlo ahora.
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
- Observación para la Tarea 11: `docker-compose.yml` deberá pasar la variable `ALMACEN_LOCAL_PATH` al servicio `backend` y montar un volumen para dicha carpeta con permisos de escritura para el usuario `node`.
- Pruebas: 52 pruebas pasando con 100% de cobertura en Stmts, Branch, Funcs y Lines. Al ejecutarse en el sandbox de Antigravity en Windows, `supertest` requiere `BypassSandbox: true` porque enlaza un socket de loopback efímero para simular las peticiones HTTP.
- El `git add` y el `git commit` requieren `BypassSandbox: true` en Antigravity (el sandbox bloquea la escritura en `.git/`). Los demás comandos de lectura funcionan en sandbox normal.
- El proyecto está en `main`, rama activa. `npx tsc --noEmit`, `npm test` y `npm run test:cov` pasan sin errores.
- TypeScript se mantiene en la serie 5 (`^5.9.3`). No actualizar a TypeScript 7+ ya que `ts-jest@29` no lo soporta.
- Nunca crear ni comitear `.env` en el repositorio; cada desarrollador debe crearlo localmente copiando `.env.example`.
