# SDD · Rendición de Examen

## Alcance

Backend para iniciar, sincronizar respuestas y cerrar simulacros (HU04–HU05, RF04–RF07). El cliente del Sprint 3 conserva las respuestas pendientes y las sincroniza antes de pedir el cierre. Procesamiento de Resultados calificará el intento mediante el evento y la API interna de Rendición (RF07–RF08, C4 N3–N4).

## Criterios de aceptación

| Criterio | Comportamiento verificable | Fuente |
| --- | --- | --- |
| CA-RE01 | Solo un postulante activo puede rendir. La identidad proviene del JWT validado por Usuarios. Dos postulantes no pueden consultar ni modificar intentos ajenos. | RF20, AC04, ADR-008, C4 N3 |
| CA-RE02 | La rendición usa la duración y las preguntas ordenadas de la API pública del Banco. El estudiante nunca recibe las claves. Todos reciben la misma versión y orden por simulacro. | RF04, RC10, C4 N3 |
| CA-RE03 | El backend usa su propio reloj para bloquear el envío vencido y valida que cada pregunta y alternativa correspondan al examen. Las respuestas aceptadas se almacenan temporalmente en Redis y quedan disponibles para consolidación. | RF05–RF06, RC05, AC07 |
| CA-RE04 | El cierre autorizado consolida las respuestas en PostgreSQL. El cierre repetido devuelve el estado existente. Una escritura concurrente no puede alterar respuestas después del cierre. Fallas de Redis o PostgreSQL impiden confirmar un cierre incompleto. | RC07, ADR-015, diseño interno §5, C4 N4 §3.3 |
| CA-RE05 | El cierre deja registrado un evento pendiente de entrega a RabbitMQ incluso si el broker cae. La API interna entrega los datos definitivos de un examen finalizado. La solicitud no espera la calificación. | RF07, RC06, C4 N3–N4 |
| CA-RE06 | OpenAPI documenta el contrato de rendición. Jest y Docker Compose validan autorización, plazos, aislamiento, sincronización, concurrencia, cierre y recuperación ante fallas. Registrar cobertura de líneas y ramas con objetivos de 80 % y 70 %. | Sprint 2, AC04, AC07 |

El módulo conserva las cuatro capas de ADR-002. Usa los contratos públicos de Usuarios y Banco, con los adaptadores de persistencia y mensajería descritos en el diseño interno. La medición de la latencia de la calificación depende del Módulo 4. La prueba de carga de hasta 2 000 usuarios virtuales sigue prevista al final del Sprint 2 (AC03).

## Decisiones aprobadas

1. **Plazo y recuperación (CA-RE03, CA-RE04, RF06, AC07).** El servidor fija el inicio y el vencimiento. A partir del vencimiento rechaza cambios, aunque se hayan marcado antes en el dispositivo. El cierre automático consolida únicamente las respuestas válidas sincronizadas. Durante la vigencia, la reconexión recupera las respuestas sincronizadas y el tiempo restante. La desconexión no altera el plazo.
2. **Acceso e intento único (CA-RE01, CA-RE02, RF20).** Los postulantes activos pueden iniciar un simulacro disponible. Cada postulante tiene un solo intento por simulacro. Repetir el inicio recupera el intento vigente. El cierre manual y el vencimiento impiden reiniciarlo. Se aplican las restricciones originales de acceso.
3. **Versión congelada (CA-RE02, RC10).** El primer intento fija una versión común e inmutable, con duración, preguntas, contenido, alternativas, orden y claves. Los inicios concurrentes convergen en esa versión y las ediciones posteriores no la alteran. El Banco conserva las claves y las entrega por un contrato interno separado de la proyección visible.
4. **Modalidad impresa (CA-RE02, CA-RE03, RF05).** Comparte intento, plazo y sincronización con la modalidad virtual. Puede identificar cada pregunta por su número en el orden congelado. La rendición virtual permite consultar el enunciado y las alternativas dentro del sistema.
5. **Cambios y reintentos (CA-RE03, CA-RE04, RF06).** Se permite marcar, sustituir y borrar durante la vigencia. Cada pregunta usa una revisión asignada por el servidor. El cliente envía la revisión base y un identificador de operación. Un reintento no repite el cambio y una actualización con revisión obsoleta no puede sobrescribir otra. El borrado conserva la revisión. Tras el cierre, las respuestas son inmutables.

## Admisión a simulacros habilitados

CA-VS02 y CA-VS03 verifican que la habilitación y los inicios concurrentes respeten el padrón congelado. El cierre de ciclo comprueba intentos y simulacros sin interrumpir el procesamiento de calificaciones. Ver [SDD de validación](../validacion-sprint-2/spec.md).

## Consulta de simulacros para el cliente web

GET /api/v1/examenes/simulacros enumera intentos propios y simulacros nuevos cuyo padrón contiene al postulante, con vínculo vigente al ciclo y sin cierre general solicitado. Los simulacros legados sin padrón aparecen cuando hay un intento propio. El listado no inicia el intento, no obtiene preguntas ni claves y no sustituye las verificaciones de POST /iniciar.
