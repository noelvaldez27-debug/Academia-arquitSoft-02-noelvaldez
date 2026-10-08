
# Decisiones arquitectónicas

| ID | Decisión arquitectónica | Driver relacionado | Justificación | Resultado |
|---|---|---|---|---|
| ADR-001 | Monolito modular | DA01 – Escalabilidad; DA10 – Mantenibilidad | Organizar las funcionalidades en módulos independientes dentro de una misma aplicación, facilitando su mantenimiento y escalamiento. | Módulos de Usuarios, Banco de Preguntas, Rendición de Examen, Resultados, Ranking y Analítica. |
| ADR-002 | Clean Architecture | DA10 – Mantenibilidad | Separar las reglas del negocio de las tecnologías externas para facilitar modificaciones y pruebas. | Capas de Dominio, Aplicación, Presentación e Infraestructura. |
| ADR-003 | Almacenamiento temporal con Redis | DA02 – Rendimiento; DA08 – Persistencia | Almacenar temporalmente las respuestas durante los exámenes para reducir la carga sobre PostgreSQL. | Redis para respuestas activas y PostgreSQL para almacenamiento definitivo. |
| ADR-004 | Procesamiento asíncrono con RabbitMQ | DA02 – Rendimiento; DA07 – Procesamiento asíncrono | Procesar el cálculo de resultados y rankings en segundo plano sin bloquear la plataforma. | Cola RabbitMQ y workers para procesamiento de resultados. |
| ADR-005 | Escalamiento automático con Kubernetes | DA01 – Escalabilidad; DA03 – Disponibilidad; DA06 – Eficiencia de costos | Ajustar automáticamente los recursos durante simulacros masivos y reducirlos en periodos de baja demanda. | Contenedores Docker gestionados mediante Kubernetes. |
| ADR-006 | Enfoque offline-first | DA04 – Resiliencia | Evitar la pérdida de respuestas cuando el postulante tenga problemas de conexión a internet. | Almacenamiento local y sincronización automática de respuestas. |
| ADR-007 | Autenticación y control de acceso por roles | DA05 – Seguridad | Proteger los datos personales y académicos restringiendo el acceso según el tipo de usuario. | Autenticación propia, cifrado y autorización por roles. |
| ADR-008 | Comunicación mediante API REST | DA09 – API REST | Separar la interfaz web de los servicios mediante una comunicación estandarizada. | API REST entre frontend y backend. |
