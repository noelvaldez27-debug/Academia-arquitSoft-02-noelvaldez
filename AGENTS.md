# AGENTS.md — EVALUA-NET

## Proyecto
Sistema web de simulacros de exámenes virtuales con IA para la Academia Preuniversitaria Sofía (curso IS-488 Arquitectura de Software, UNSCH).
La documentación está en `docs/` (análisis, arquitectura, diseño y modelo C4). Es la fuente de verdad: léela antes de proponer cambios de diseño.
El proyecto avanza por sprints: Sprint 2 = implementación y validación de los seis módulos del backend y desarrollo de la aplicación web; Sprint 3 = integración final y despliegue en AWS.

## Stack
- Backend: Node.js + TypeScript
- API REST (HTTPS/JSON) con JWT (RC03, ADR-008), documentada con OpenAPI/Swagger
- PostgreSQL (datos definitivos, RC07), Redis (respuestas temporales y caché, RC05), RabbitMQ (mensajería y workers, RC06)
- Contenedores Docker. Kubernetes es el objetivo de producción (RC04, ADR-005); el despliegue académico usa una instancia EC2 con docker-compose (ADR-013)
- Nube de despliegue: AWS (RC13)
- Servicio de IA: capa gratuita de Gemini, detrás de la interfaz `ServicioIA` (ADR-010, ADR-011). Las imágenes se leen con el mismo modelo, sin OCR aparte
- Archivos (separatas): interfaz `AlmacenArchivos`; disco local en el Sprint 2 y Amazon S3 en el despliegue (ADR-012)
- Aplicación web: React + Tailwind CSS en la carpeta `frontend/`, separada del backend (ADR-014). Se construye y verifica localmente en el Sprint 2
- Pruebas: Jest con reporte de cobertura, GitHub Actions para ejecutarlas, k6 para carga (hasta 2,000 usuarios virtuales)

## Arquitectura
- Estilo: monolito modular con procesamiento asíncrono (ADR-001)
- Clean Architecture dentro de cada módulo, con 4 capas: Dominio, Aplicación, Infraestructura y Presentación (ADR-002), más la raíz de composición
- Módulos: Gestión de Usuarios, Banco de Preguntas, Rendición de Examen, Procesamiento de Resultados, Ranking y Reportes, Analítica del Estudiante
- Orden de implementación: base del proyecto (Docker, CI), Usuarios, Banco de Preguntas, Rendición de Examen, Procesamiento de Resultados, Ranking y Reportes, Analítica
- Un módulo NO accede a los repositorios ni tablas de otro; solo usa su API pública a través de un puerto
- Los módulos usan la IA y los archivos solo a través de `ServicioIA` y `AlmacenArchivos`; nunca importan Gemini ni S3 directamente
- Patrones: Repository, Adapter, Dependency Injection. Principios SOLID
- Regla de dependencia: Dominio no depende de nada externo; Aplicación depende solo de Dominio; Presentación depende de Aplicación; Infraestructura implementa los contratos de Dominio y Aplicación
- La aplicación web NO es un módulo: vive en `frontend/`, fuera de `src/modules/`

## Estructura de cada módulo (ver docs/03-diseno-de-software/diseno-interno-de-modulos.md)
src/modules/<modulo>/
    dominio/            entidades, estados, repository.ts
    aplicacion/         *.use-case.ts, *.command.ts, *.port.ts
    infraestructura/    postgres-*-repository.ts, *.adapter.ts
    presentacion/       *.controller.ts, *.routes.ts
    <modulo>.module.ts  composición e inyección de dependencias
    index.ts            API pública del módulo

## Convenciones
- Commits cortos en minúsculas y sin tildes: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `test: ...`, `refactor: ...`, `wip: ...`
- Rama principal: `main`
- Nombres de archivos y carpetas en español y kebab-case, como en el diseño interno
- Respuestas al usuario en español, con explicaciones sencillas
- Contraseñas siempre cifradas con hash (AC04); nunca en texto plano ni en los logs
- Ningún secreto en el repositorio: todo va en variables de entorno y se documenta en `.env.example`

## Protocolo de trabajo (obligatorio)
1. Al empezar: lee `AGENTS.md`, `PROGRESO.md` y `specs/<modulo>/tasks.md`; ejecuta `git log --oneline -10` y `git status`.
2. Trabaja SOLO la primera tarea sin marcar de `tasks.md`. No repitas tareas marcadas `[x]`.
3. Al terminar una tarea: márcala `[x]` en `tasks.md` y haz un commit (`feat: descripcion corta`).
4. Al cerrar la sesión, o si te quedas sin tokens a mitad de tarea: haz commit (`wip: descripcion` si quedó incompleta) y actualiza `PROGRESO.md` con lo hecho, las decisiones tomadas y el siguiente paso exacto.
5. Nunca reescribas código de tareas ya marcadas, salvo que el usuario lo pida.
6. Si algo no está definido en `docs/`, pregunta al usuario; no lo inventes.
7. Si lo que vas a hacer contradice un ADR o una restricción de `docs/01-analisis-de-sistema/`, detente y avisa al usuario antes de escribir código.
8. Un módulo está terminado solo cuando tiene: código por capas, endpoints documentados en OpenAPI, pruebas Jest que pasan con su reporte de cobertura, y sus tareas marcadas en `tasks.md`.
9. Todo debe arrancar con `docker compose up` y sin configuración manual, para que el despliegue del Sprint 3 sea reproducible.
10. En las pruebas automatizadas y de carga usa el adaptador simulado de `ServicioIA`, nunca la IA real, para no gastar la cuota gratuita.


## Skills (procedimientos reutilizables)
Están en la carpeta `skills/`. Léelos cuando la tarea coincida; no los reinventes:
- `skills/implementar-caso-de-uso.md`: cómo escribir un caso de uso por capas, de adentro hacia afuera
- `skills/escribir-pruebas-jest.md`: cómo probar un caso de uso y revisar la cobertura
- `skills/cerrar-sesion.md`: cómo dejar el traspaso listo antes de cambiar de IDE o cuando se acaben los tokens. Úsalo siempre al terminar

## Enunciados del docente
- `docs/sprint-2.md`: lo que se evalúa en la implementación del backend
- `docs/sprint-3.md`: lo que se evalúa en la integración y el despliegue