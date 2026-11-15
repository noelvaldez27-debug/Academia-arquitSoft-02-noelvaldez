# Patrones de diseño

**Proyecto:** EVALUA-NET – Sistema de simulacros de exámenes virtuales con IA – Academia Sofía

## Objetivo

Documentar los patrones de diseño seleccionados para el backend de EVALUA-NET, indicando dónde se utilizarán, qué problemas resolverán y con qué tecnologías se implementarán, para que el desarrollo del sistema mantenga una estructura organizada y uniforme.

## Contexto

- **Estilo arquitectónico:** Monolito modular con procesamiento asíncrono y servicio de IA independiente.
- **Enfoque interno:** Clean Architecture.
- **Tecnología de referencia:** Node.js + TypeScript.
- **Base:** Diseño interno de módulos y diagrama de componentes (C4 nivel 3).
- **Tecnologías:** PostgreSQL, Redis, RabbitMQ, almacenamiento de archivos (disco, S3 o MinIO, por definir), OCR (por definir) y servicio de IA (proveedor por confirmar).

## Patrones de diseño seleccionados

| **Patrón** | **Dónde se usa** | **Problema que resuelve** | **Se implementa con** | **Archivos de referencia** |
|---|---|---|---|---|
| Repository | Rendición de Examen → Base de datos | Evita que las reglas del negocio dependan directamente de SQL. | PostgreSQL y repositorios concretos. | `examen-repository.ts`, `postgres-examen-repository.ts` |
| Repository | Banco de Preguntas → Base de datos | Separa la gestión de separatas y preguntas propuestas de las consultas a la base de datos. | PostgreSQL. | `separata-repository.ts`, `postgres-separata-repository.ts` |
| Adapter | Rendición de Examen → Redis | Permite almacenar respuestas temporales sin depender directamente de Redis. | Redis. | `respuestas-temporales.port.ts`, `redis-respuestas.adapter.ts` |
| Adapter | Rendición de Examen → RabbitMQ | Permite enviar el evento de examen finalizado para su procesamiento sin depender directamente del sistema de mensajería. | RabbitMQ. | `publicador-examen.port.ts`, `rabbitmq-examen.adapter.ts` |
| Adapter | Banco de Preguntas → Almacenamiento de archivos | Permite guardar la separata original sin depender de disco, S3 o MinIO. | Disco, S3 o MinIO (por definir). | `almacen-de-archivos.port.ts`, `almacen-archivos.adapter.ts` |
| Adapter | Banco de Preguntas → RabbitMQ | Permite avisar que se subió una separata para procesarla en segundo plano. | RabbitMQ. | `publicador-separata.port.ts`, `rabbitmq-separata.adapter.ts` |
| Adapter | Banco de Preguntas → Servicio de IA | Permite generar preguntas a partir del texto sin depender de un proveedor de IA específico. | API REST. | `generador-de-preguntas.port.ts`, `ia-preguntas.adapter.ts` |
| Adapter | Analítica del Estudiante → Servicio de IA | Facilita la comunicación con el servicio independiente de inteligencia artificial. | API REST. | `recomendaciones.port.ts`, `ia-recomendaciones.adapter.ts` |
| Strategy | Banco de Preguntas → Extracción de texto | Permite extraer el texto de la separata según su formato (PDF, DOCX o imagen) sin condicionales en el caso de uso. | Un extractor por formato. | `extractor-de-texto.port.ts`, `extractor-pdf.adapter.ts`, `extractor-docx.adapter.ts`, `extractor-ocr.adapter.ts` |
| Dependency Injection | Todos los módulos del backend | Evita que los casos de uso creen directamente sus dependencias. | Interfaces y constructores. | `rendicion.module.ts`, `banco-preguntas.module.ts` |

**Nota:** Los archivos mencionados corresponden al diseño propuesto y servirán como referencia durante la implementación del sistema.

## Cómo funciona cada patrón

| **Patrón** | **En pocas palabras** |
|---|---|
| Repository | El sistema solicita `guardar(examen)` y el repositorio se encarga de almacenar los datos en PostgreSQL. |
| Adapter | El sistema solicita `guardar(examenId, respuesta)` y el adaptador utiliza Redis para guardar temporalmente la respuesta. |
| Adapter | Cuando un examen finaliza, el adaptador publica el evento `ExamenFinalizado` en RabbitMQ para iniciar su procesamiento. |
| Adapter | Cuando se sube una separata, un adaptador guarda el archivo original y otro publica el evento `SeparataSubida` en RabbitMQ. |
| Adapter | El sistema solicita `proponer(texto, curso)` y el adaptador se comunica con el servicio de IA para obtener preguntas propuestas. |
| Adapter | El sistema solicita `generarRecomendaciones()` y el adaptador se comunica con el servicio independiente de IA. |
| Strategy | El caso de uso recibe todos los extractores y usa el que responde `soporta(formato)`. Agregar un formato nuevo solo requiere un extractor nuevo. |
| Dependency Injection | Un caso de uso recibe los repositorios y servicios que necesita mediante su constructor, sin crearlos directamente. |

## Para memorizar

| **Si necesito...** | **Uso el patrón...** |
|---|---|
| Guardar y consultar datos sin escribir SQL en el negocio | Repository |
| Conectar una tecnología externa (Redis, RabbitMQ, IA, almacenamiento) | Adapter |
| Elegir entre varias formas de hacer lo mismo (PDF, DOCX, imagen) | Strategy |
| Que una clase reciba lo que necesita en vez de crearlo | Dependency Injection |

## Beneficios

- Permite cambiar las tecnologías de almacenamiento o mensajería sin modificar las reglas del negocio, siempre que se mantengan las interfaces.
- Facilita las pruebas de los módulos mediante implementaciones simuladas.
- Reduce la dependencia entre los componentes del sistema.
- Permite integrar el servicio de IA sin afectar directamente la lógica principal.
- Permite aceptar nuevos formatos de separatas agregando un extractor, sin modificar los casos de uso.
- Facilita el mantenimiento y la incorporación de nuevas funcionalidades.

## Patrones previstos para siguientes iteraciones

| **Patrón** | **Dónde se aplicaría** | **Cuándo** |
|---|---|---|
| Observer | Procesamiento de Resultados → Ranking y Analítica | Cuando sea necesario actualizar otros módulos al generarse nuevos resultados. |
| Strategy | Procesamiento de Resultados | Cuando existan diferentes métodos de calificación según el tipo de simulacro. |
| Factory | Banco de Preguntas → Generación de Simulacros | Cuando se necesite crear simulacros con diferentes configuraciones. |
| Decorator | Ranking y Reportes → Caché | Cuando se requiera acelerar las consultas frecuentes utilizando Redis. |
| Facade | Comunicación entre módulos | Cuando los módulos necesiten una interfaz simplificada para acceder a sus funcionalidades. |