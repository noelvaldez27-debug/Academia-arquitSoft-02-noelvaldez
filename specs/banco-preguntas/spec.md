# Especificación — Banco de Preguntas

> HU03, HU12, HU13 · RF03, RF15–RF18 · RC12 · AC04, AC05 · ADR-007–012, ADR-015

## Alcance

Gestionar el banco por curso y procesar las separatas subidas por docentes. La API pública del módulo debe permitir que Rendición consulte configuración y preguntas, y que Procesamiento de Resultados consulte las claves por su puerto interno. C4 N3 asigna la configuración de evaluaciones a este módulo. Su alcance y datos se deben confirmar antes de implementarla.

## Criterios de aceptación

- **CA-BP01 · Banco por curso.** El administrador general puede cargar y editar preguntas directamente. Cada curso tiene identificador único y nombre. Cada pregunta tiene cinco alternativas, de A a E, y una sola correcta.
- **CA-BP02 · Subida.** Un docente o encargado académico autorizado puede subir DOCX, PDF, JPG, JPEG o PNG para un curso. El máximo es configurable y su valor inicial es 20 MB por archivo. El docente convierte los archivos .doc antiguos a .docx antes de la subida. Un formato no admitido o un archivo que supera el máximo se rechaza antes de guardarlo. El original se guarda mediante AlmacenArchivos y la solicitud se confirma antes de la extracción.
- **CA-BP03 · Extracción.** El worker consume SeparataSubida desde RabbitMQ. Lee localmente Word y PDF con texto. Para imágenes y PDF escaneados solicita la lectura multimodal a ServicioIA según ADR-011. Una extracción fallida queda en ERROR_EXTRACCION y el docente puede consultar su estado y motivo en el módulo.
- **CA-BP04 · Propuestas.** El worker pide a ServicioIA preguntas con alternativas a partir del texto extraído. Guarda el resultado como propuestas y una entrega repetida no genera duplicados.
- **CA-BP05 · Revisión.** Un docente o encargado académico autorizado puede revisar las propuestas de sus propias separatas. El administrador general puede revisar todas las separatas. La corrección, aprobación y descarte respetan RF18 y RC12. Solo aprobarla incorpora la pregunta al banco. Descartarla conserva el estado RECHAZADA.
- **CA-BP06 · Aislamiento.** Banco de Preguntas usa autenticación y autorización de la API pública de Usuarios. Cada módulo consulta sus propias tablas. Los endpoints REST se documentan en OpenAPI. Las claves se entregan mediante el puerto interno de evaluación.

## Persistencia y estados

PostgreSQL conserva las preguntas, separatas, propuestas y su estado mediante migraciones SQL. El original se guarda en disco local a través de AlmacenArchivos en Sprint 2. Redis no interviene en este flujo.

- Separata: SUBIDA → EN_EXTRACCION → TEXTO_EXTRAIDO → PREGUNTAS_PROPUESTAS, con ERROR_EXTRACCION para la extracción fallida.
- Propuesta: PROPUESTA → APROBADA o RECHAZADA.

## Procesamiento externo

Solo puede enviarse a Gemini contenido académico cuya transferencia esté autorizada. La regla cubre el texto extraído, las imágenes y los PDF escaneados. Se excluyen datos personales, credenciales e información confidencial. Las pruebas y CI usan el proveedor simulado.

## Pendiente de confirmación

- **Simulacros (C4 N3, RF06).** Se conserva el contrato por API pública. Falta precisar los campos mínimos, quién crea la configuración y cómo se seleccionan las preguntas. La duración se desprende de RF06, pero el C4 no define el esquema de configuración.
- **Autorización de transferencias (C4 N1, ADR-010 y ADR-011).** Falta definir quién autoriza cada separata y cómo se acredita que su contenido puede salir del sistema.
- **Roles (HU03, RF18 y RC12).** La referencia del C4 a gestión docente se aplica a la revisión de propuestas propias. La aprobación que incorpora propuestas al banco requiere validación docente. Debe aclararse si encargado académico es una denominación del rol Docente existente o un permiso distinto, y si el alcance de revisión del administrador general comprende corregir o descartar propuestas.
