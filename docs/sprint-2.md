# Sprint 2: Implementación y validación de la arquitectura de software

Fuente: enunciado del docente (curso IS-488 Arquitectura de Software).

En este sprint, los estudiantes llevarán a código la arquitectura documentada en el Sprint 1, implementando una primera versión funcional del proyecto.

## Actividades

1. Implementar el estilo arquitectónico.
2. Aplicar el enfoque o patrón arquitectónico (ejemplo: Clean Architecture, MVC).
3. Especificaciones SDD de las funcionalidades implementadas, incluyendo criterios de aceptación y tareas técnicas.
4. Endpoints REST funcionales y documentados con OpenAPI/Swagger.
5. Analizar el comportamiento de la base de datos y la estrategia de caché.
6. Aplicar principios SOLID y patrones de diseño cuando corresponda.
7. Implementar pruebas automatizadas con Jest para validar las funcionalidades y reglas de negocio. Se recomienda integrar estas pruebas en un flujo CI/CD mediante GitHub Actions, para automatizar su ejecución ante cada cambio en el código.
8. Ejecutar pruebas basadas en los escenarios de atributos de calidad definidos en el Sprint 1, utilizando herramientas adecuadas como Postman, k6 (simular progresivamente hasta 2,000 usuarios virtuales concurrentes), Jest, entre otros.

## Entregables

- Código fuente organizado según la arquitectura propuesta.
- Primera versión funcional del proyecto.
- Documentación de API mediante OpenAPI/Swagger.
- Pruebas automatizadas con Jest y reporte de cobertura.
- Evidencias y resultados de validación de los atributos de calidad.

## Criterio fundamental

Se evaluará que la implementación respete las decisiones arquitectónicas documentadas y que los estudiantes puedan demostrar, mediante pruebas, si la solución responde a los atributos de calidad establecidos.

## Notas del proyecto (no forman parte del enunciado)

- Se implementan los 6 módulos del backend completos, no solo los prioritarios.
- La aplicación web y el despliegue en AWS corresponden al Sprint 3 (ver `docs/sprint-3.md`).
- Las pruebas de carga con k6 llegan hasta 2,000 usuarios virtuales, aunque el atributo AC03 define un objetivo de 5,000 conexiones (ver `04-atributos-de-calidad.md`).
- En las pruebas automatizadas y de carga se usa el adaptador simulado de `ServicioIA`, nunca la IA real.