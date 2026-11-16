# AGENTS.md — EVALUA-NET

## Proyecto
Sistema web de simulacros de exámenes virtuales con IA para la Academia Preuniversitaria Sofía (curso IS-488 Arquitectura de Software, UNSCH).
La documentación está en `docs/` (análisis, arquitectura, diseño y modelo C4). Es la fuente de verdad: léela antes de proponer cambios de diseño.

## Stack
- Backend: Node.js + TypeScript
- API REST (HTTPS/JSON) con JWT (RC03, ADR-008)
- PostgreSQL (datos definitivos, RC07), Redis (respuestas temporales y caché, RC05), RabbitMQ (mensajería y workers, RC06)
- Contenedores Docker orquestados con Kubernetes (RC04, ADR-005)
- Nube de despliegue: AWS
- Servicio de IA: separado del backend principal (tecnología por confirmar)

## Arquitectura
- Estilo: monolito modular con procesamiento asíncrono (ADR-001)
- Clean Architecture dentro de cada módulo, con 4 capas: Dominio, Aplicación, Infraestructura y Presentación (ADR-002), más la raíz de composición
- Módulos: Gestión de Usuarios, Banco de Preguntas, Rendición de Examen, Procesamiento de Resultados, Ranking y Reportes, Analítica del Estudiante
- Un módulo NO accede a los repositorios ni tablas de otro; solo usa su API pública a través de un puerto
- Patrones: Repository, Adapter, Dependency Injection. Principios SOLID
- Regla de dependencia: Dominio no depende de nada externo; Aplicación depende solo de Dominio; Presentación depende de Aplicación; Infraestructura implementa los contratos de Dominio y Aplicación

## Estructura de cada módulo (ver docs/03-diseno-de-software/diseno-interno-de-modulos.md)
src/modules/<modulo>/
    dominio/            entidades, estados, repository.ts
    aplicacion/         *.use-case.ts, *.command.ts, *.port.ts
    infraestructura/    postgres-*-repository.ts, *.adapter.ts
    presentacion/       *.controller.ts, *.routes.ts
    <modulo>.module.ts  composición e inyección de dependencias
    index.ts            API pública del módulo

## Convenciones
- Commits cortos en minúsculas y sin tildes: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `wip: ...`
- Rama principal: `main`
- Nombres de archivos y carpetas en español y kebab-case, como en el diseño interno
- Respuestas al usuario en español, con explicaciones sencillas

## Protocolo de trabajo (obligatorio)
1. Al empezar: lee `AGENTS.md`, `PROGRESO.md` y `specs/<modulo>/tasks.md`; ejecuta `git log --oneline -10` y `git status`.
2. Trabaja SOLO la primera tarea sin marcar de `tasks.md`. No repitas tareas marcadas `[x]`.
3. Al terminar una tarea: márcala `[x]` en `tasks.md` y haz un commit (`feat: descripcion corta`).
4. Si te quedas sin tokens a mitad de tarea: haz commit `wip: descripcion` y anota en `PROGRESO.md` qué falta.
5. Nunca reescribas código de tareas ya marcadas, salvo que el usuario lo pida.
6. Si algo no está definido en `docs/`, pregunta al usuario; no lo inventes.
