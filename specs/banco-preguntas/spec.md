# Especificación — Banco de Preguntas

> HU03, HU12, HU13 · RF03, RF15–RF18 · RC12 · AC04, AC05 · ADR-007–012, ADR-015

## Alcance

Gestionar el banco por curso y procesar las separatas subidas por docentes. La API pública del módulo debe permitir que Rendición consulte configuración y preguntas, y que Procesamiento de Resultados consulte las claves por su puerto interno. C4 N3 asigna la configuración de evaluaciones a este módulo. El administrador general crea y gestiona la configuración. El contrato incluye identificador único, duración y una lista ordenada de preguntas seleccionadas explícitamente. Solo se seleccionan preguntas aprobadas y habilitadas (C4 N3, RF06). Rendición aplica el tiempo y administra el intento.

## Criterios de aceptación

- **CA-BP01 · Banco por curso.** El administrador general puede cargar y editar preguntas directamente. Cada curso tiene identificador único y nombre. Cada pregunta tiene cinco alternativas, de A a E, y una sola correcta.
- **CA-BP02 · Subida.** Un docente o encargado académico autorizado puede subir DOCX, PDF, JPG, JPEG o PNG para un curso. El máximo es configurable y su valor inicial es 20 MB por archivo. El docente convierte los archivos .doc antiguos a .docx antes de la subida. Un formato no admitido o un archivo que supera el máximo se rechaza antes de guardarlo. El original se guarda mediante AlmacenArchivos y la solicitud se confirma antes de la extracción.
- **CA-BP03 · Extracción.** El worker consume SeparataSubida desde RabbitMQ. Lee localmente Word y PDF con texto. Para imágenes y PDF escaneados solicita la lectura multimodal a ServicioIA según ADR-011. Una extracción fallida queda en ERROR_EXTRACCION y el docente puede consultar su estado y motivo en el módulo.
- **CA-BP04 · Propuestas.** El worker pide a ServicioIA preguntas con alternativas a partir del texto extraído. Guarda el resultado como propuestas y una entrega repetida no genera duplicados.
- **CA-BP05 · Revisión.** Un docente o encargado académico autorizado puede revisar las propuestas de sus propias separatas. El administrador general puede revisar todas las separatas. El encargado académico usa el rol Docente existente. El administrador general puede corregir y descartar. La incorporación definitiva requiere la aprobación del docente responsable. Cualquier modificación posterior invalida esa aprobación hasta que el docente vuelva a validar la propuesta (RF18, RC12). Solo aprobarla incorpora la pregunta al banco. Descartarla conserva el estado RECHAZADA.
- **CA-BP06 · Aislamiento.** Banco de Preguntas usa autenticación y autorización de la API pública de Usuarios. Cada módulo consulta sus propias tablas. Los endpoints REST se documentan en OpenAPI. Las claves se entregan mediante el puerto interno de evaluación.

## Persistencia y estados

PostgreSQL conserva las preguntas, separatas, propuestas y su estado mediante migraciones SQL. El original se guarda en disco local a través de AlmacenArchivos en Sprint 2. Redis no interviene en este flujo.

- Separata: SUBIDA → EN_EXTRACCION → TEXTO_EXTRAIDO → PREGUNTAS_PROPUESTAS, con ERROR_EXTRACCION para la extracción fallida.
- Propuesta: PROPUESTA → APROBADA o RECHAZADA.

## Procesamiento externo

Solo puede enviarse a Gemini contenido académico cuya transferencia esté autorizada. La regla cubre el texto extraído, las imágenes y los PDF escaneados. Se excluyen datos personales, credenciales e información confidencial. Las pruebas y CI usan el proveedor simulado.

El administrador general comprueba los permisos sobre el contenido antes de autorizar el procesamiento externo. La autorización registra identificador de separata, identificador del autorizador, fecha, estado y alcance. El worker comprueba que la autorización vigente cubre el material que va a transferir. Las pruebas usan contenido sintético y proveedores simulados. Una llamada real requiere autorización específica.
