
# Patrones de diseño

**Proyecto:** EVALUA-NET – Sistema de simulacros de exámenes virtuales con IA – Academia Sofía

## Objetivo

Documentar los patrones de diseño seleccionados para el backend de EVALUA-NET, indicando dónde se utilizarán, qué problemas resolverán y con qué tecnologías se implementarán, para que el desarrollo del sistema mantenga una estructura organizada y uniforme.

## Contexto

- **Estilo arquitectónico:** Monolito modular con procesamiento asíncrono y servicio de IA independiente.
- **Enfoque interno:** Clean Architecture.
- **Tecnología de referencia:** Node.js + TypeScript.
- **Base:** Diseño interno de módulos y diagrama de componentes (C4 nivel 3).
- **Tecnologías:** PostgreSQL, Redis y RabbitMQ.

## Patrones de diseño seleccionados

| **Patrón** | **Dónde se usa** | **Problema que resuelve** | **Se implementa con** | **Archivos de referencia** |
|---|---|---|---|---|
| Repository | Rendición de Examen → Base de datos | Evita que las reglas del negocio dependan directamente de SQL. | PostgreSQL y repositorios concretos. | `examen-repository.ts`, `postgres-examen-repository.ts` |
| Repository | Banco de Preguntas → Base de datos | Separa la gestión de preguntas de las consultas a la base de datos. | PostgreSQL. | `pregunta-repository.ts`, `postgres-pregunta-repository.ts` |
| Adapter | Rendición de Examen → Redis | Permite almacenar respuestas temporales sin depender directamente de Redis. | Redis. | `respuestas-temporales.port.ts`, `redis-respuestas.adapter.ts` |
| Adapter | Procesamiento de Resultados → RabbitMQ | Permite enviar eventos para procesar los exámenes sin depender directamente del sistema de mensajería. | RabbitMQ. | `publicador-examen.port.ts`, `rabbitmq-examen.adapter.ts` |
| Adapter | Analítica del Estudiante → Servicio de IA | Facilita la comunicación con el servicio independiente de inteligencia artificial. | API REST. | `recomendaciones.port.ts`, `ia-recomendaciones.adapter.ts` |
| Dependency Injection | Todos los módulos del backend | Evita que los casos de uso creen directamente sus dependencias. | Interfaces y constructores. | `rendicion.module.ts` |

**Nota:** Los archivos mencionados corresponden al diseño propuesto y servirán como referencia durante la implementación del sistema.

## Cómo funciona cada patrón

| **Patrón** | **En pocas palabras** |
|---|---|
| Repository | El sistema solicita `guardar(examen)` y el repositorio se encarga de almacenar los datos en PostgreSQL. |
| Adapter | El sistema solicita `guardarRespuesta()` y el adaptador utiliza Redis para guardar temporalmente la respuesta. |
| Adapter | Cuando un examen finaliza, el adaptador publica un evento en RabbitMQ para iniciar su procesamiento. |
| Adapter | El sistema solicita `generarRecomendaciones()` y el adaptador se comunica con el servicio independiente de IA. |
| Dependency Injection | Un caso de uso recibe los repositorios y servicios que necesita mediante su constructor, sin crearlos directamente. |

## Beneficios

- Permite cambiar las tecnologías de almacenamiento o mensajería sin modificar las reglas del negocio, siempre que se mantengan las interfaces.
- Facilita las pruebas de los módulos mediante implementaciones simuladas.
- Reduce la dependencia entre los componentes del sistema.
- Permite integrar el servicio de IA sin afectar directamente la lógica principal.
- Facilita el mantenimiento y la incorporación de nuevas funcionalidades.

## Patrones previstos para siguientes iteraciones

| **Patrón** | **Dónde se aplicaría** | **Cuándo** |
|---|---|---|
| Observer | Procesamiento de Resultados → Ranking y Analítica | Cuando sea necesario actualizar otros módulos al generarse nuevos resultados. |
| Strategy | Procesamiento de Resultados | Cuando existan diferentes métodos de calificación según el tipo de simulacro. |
| Factory | Banco de Preguntas → Generación de Simulacros | Cuando se necesite crear simulacros con diferentes configuraciones. |
| Decorator | Ranking y Reportes → Caché | Cuando se requiera acelerar las consultas frecuentes utilizando Redis. |
| Facade | Comunicación entre módulos | Cuando los módulos necesiten una interfaz simplificada para acceder a sus funcionalidades. |

