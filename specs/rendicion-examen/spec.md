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

## Decisiones de negocio pendientes

1. Cierre al vencer. RF06 bloquea el envío al vencimiento, mientras AC07 pide recuperar las respuestas tras una desconexión. Confirmar si se cierra automáticamente con lo ya sincronizado o si existe otro cierre autorizado, y qué ocurre con las respuestas locales que llegan tarde.
2. Acceso e intentos. El Banco entrega duración y preguntas, pero no una ventana, convocatoria por sede ni cupo de intentos. Confirmar elegibilidad, momento de inicio del reloj y si un inicio repetido reanuda el mismo intento.
3. Versión inmutable. RC10 exige igualdad, pero la configuración y las preguntas son editables y la clave actual se consulta por ID de simulacro. Confirmar cuándo se fija la versión y si se permite restringir cambios en el Banco o agregar versionado al contrato público para conservar preguntas y claves.
4. Modalidad impresa. RF05 exige marcado desde celular. Confirmar si usa el mismo intento y sincronización identificando preguntas por su posición o si debe tener reglas propias.
5. Edición y sincronización. Confirmar si se puede cambiar o borrar una marca y qué versión prevalece si un reintento atrasado llega después de una edición más nueva.
