# Tareas — Banco de Preguntas

> Especificación en spec.md. Implementar en orden, con pruebas Jest para cada tarea de código.

- [x] 1. Elaborar la SDD a partir del análisis, ADR, C4 y diseño interno. Registrar las reglas pendientes de confirmación.
- [x] 2. Confirmar el alcance funcional y los criterios pendientes. Alinear los permisos de gestión con el análisis y C4. Resolver los requisitos de configuración que necesita Rendición.
- [x] 3. Crear las cuatro capas, la raíz de composición, las entidades y los puertos de repositorio. Probar reglas y transiciones.
- [x] 4. Crear migraciones SQL y repositorios PostgreSQL de preguntas, separatas y propuestas. Validar que aprobar e incorporar al banco sea una operación atómica.
- [x] 5. Implementar la gestión directa del banco por curso, con JWT, roles de Usuarios, endpoints y OpenAPI.
- [x] 6. Implementar la subida de separatas con validación, almacenamiento local mediante AlmacenArchivos y publicación confiable de SeparataSubida. Documentar el endpoint.
- [x] 7. Implementar extractores por formato y extender ServicioIA de forma compatible para lectura multimodal. Incorporar el adaptador Gemini y actualizar el simulado para las pruebas.
- [x] 8. Implementar el worker RabbitMQ con reintentos y persistencia idempotente de propuestas. Verificar estados y errores de extracción.
- [x] 9. Implementar consulta de estado, revisión, corrección, aprobación y descarte. Documentar endpoints y validar acceso.
- [ ] 10. Exponer la API pública de Banco de Preguntas para Rendición y Resultados, con el alcance confirmado en la tarea 2.
- [ ] 11. Validar el flujo completo con Docker Compose, PostgreSQL y RabbitMQ reales e IA simulada. Contrastar las respuestas con OpenAPI.
- [ ] 12. Ejecutar Jest con cobertura, registrar evidencias y verificar GitHub Actions tras la publicación autorizada.

Antes de la tarea que corresponda, registrar decisiones sobre el contrato de adjuntos, los extractores, la fiabilidad del consumidor y cualquier dependencia o variable de entorno nueva. No incluir claves o datos reales en las pruebas ni usar Gemini en CI.
