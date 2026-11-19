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
Tarea 2 de `specs/base/tasks.md`: configurar Jest con TypeScript y reporte de cobertura. Se instalaron `jest`, `ts-jest`, `@types/jest`. Se creó `jest.config.ts` con `passWithNoTests`, cobertura sobre `src/**/*.ts` excluyendo `index.ts` y archivos `.test.ts`. Se agregaron scripts `"test"` y `"test:cov"` en `package.json`. `npm test` y `npm run test:cov` pasan con código 0. `npx tsc --noEmit` sigue sin errores.

## Tarea en curso / pendiente a medias
(ninguna)

## Siguiente paso exacto
Tarea 3 de `specs/base/tasks.md`: crear el `Dockerfile` del backend.

## Notas para el siguiente editor
- El `git add` y el `git commit` requieren `BypassSandbox: true` en Antigravity (el sandbox bloquea la escritura en `.git/`). Los demás comandos funcionan en sandbox normal.
- `npm install` también requiere red (BypassSandbox: true).
- El proyecto está en `main`, rama activa. `npx tsc --noEmit` pasa sin errores con la configuración actual.
- **TypeScript está fijado en la serie 5 (^5.8) y NO debe subirse a TS 7.** Motivo: `ts-jest@29` (última versión estable) solo soporta `typescript >= 4.3 < 7`. Si se sube TypeScript a 7, `npm install` falla con ERESOLVE. Mantener en `^5.8` hasta que `ts-jest` publique soporte oficial para TS 7.
- Las advertencias de `glob` y las vulnerabilidades moderadas que muestra `npm audit` son internas de `jest`/`ts-jest`; no son del código del proyecto y no requieren acción ahora.
- El warning de `@parcel/watcher` (allow-scripts) es de la infraestructura interna de Jest; no afecta la ejecución de pruebas.