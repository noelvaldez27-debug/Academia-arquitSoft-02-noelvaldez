# Especificación — Banco de Preguntas

> HU03, HU12, HU13 · RF03, RF15–RF18 · RC12 · AC04, AC05 · ADR-007–012, ADR-015

## Alcance

Gestionar el banco por curso y procesar las separatas subidas por docentes. La API pública del módulo debe permitir que Rendición consulte configuración y preguntas, y que Procesamiento de Resultados consulte las claves por su puerto interno. C4 N3 asigna la configuración de evaluaciones a este módulo. Su alcance y datos se deben confirmar antes de implementarla.

## Criterios de aceptación

- **CA-BP01 · Banco por curso.** Un usuario autorizado puede cargar y editar preguntas por curso. Los permisos de edición y la estructura académica quedan pendientes de confirmación.
- **CA-BP02 · Subida.** Un docente autenticado puede subir Word, PDF o imagen para un curso. Un formato no admitido o un archivo que supera el máximo se rechaza antes de guardarlo. El original se guarda mediante AlmacenArchivos y la solicitud se confirma antes de la extracción.
- **CA-BP03 · Extracción.** El worker consume SeparataSubida desde RabbitMQ. Lee localmente Word y PDF con texto. Los archivos .doc antiguos requieren conversión a .docx según el diseño interno. Para imágenes y PDF escaneados solicita la lectura multimodal a ServicioIA según ADR-011. Una extracción fallida queda en ERROR_EXTRACCION y el docente recibe el aviso por el medio que se confirme.
- **CA-BP04 · Propuestas.** El worker pide a ServicioIA preguntas con alternativas a partir del texto extraído. Guarda el resultado como propuestas y una entrega repetida no genera duplicados.
- **CA-BP05 · Revisión.** Un docente autorizado puede revisar, corregir, aprobar o descartar una propuesta. Solo aprobarla incorpora la pregunta al banco. Descartarla conserva el estado RECHAZADA.
- **CA-BP06 · Aislamiento.** Banco de Preguntas usa autenticación y autorización de la API pública de Usuarios. Cada módulo consulta sus propias tablas. Los endpoints REST se documentan en OpenAPI. Las claves se entregan mediante el puerto interno de evaluación.

## Persistencia y estados

PostgreSQL conserva las preguntas, separatas, propuestas y su estado mediante migraciones SQL. El original se guarda en disco local a través de AlmacenArchivos en Sprint 2. Redis no interviene en este flujo.

- Separata: SUBIDA → EN_EXTRACCION → TEXTO_EXTRAIDO → PREGUNTAS_PROPUESTAS, con ERROR_EXTRACCION para la extracción fallida.
- Propuesta: PROPUESTA → APROBADA o RECHAZADA.

## Pendiente de confirmación

- HU03 y la tabla de actores asignan la gestión directa al administrador general. C4 N1 también se la asigna al docente o encargado académico. Confirmar quién carga y edita directamente y si la revisión de separatas se limita al docente que las subió.
- Confirmar cómo se identifican los cursos, qué reglas rigen las alternativas y qué configuración de simulacros debe publicar el banco antes del Módulo 3.
- Confirmar extensiones de imagen admitidas, tamaño máximo y cómo se avisa al docente de un fallo. El diseño exige conversión de .doc a .docx y queda por confirmar quién realiza esa conversión.
- El C4 N1 deja pendiente qué contenido puede salir al proveedor de IA. Confirmar la autorización para enviar texto de separatas y adjuntos de imágenes o PDF escaneados a Gemini. Las pruebas usan el adaptador simulado.
