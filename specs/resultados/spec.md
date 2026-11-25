# SDD · Procesamiento de Resultados

## Alcance

Calificar en segundo plano los exámenes finalizados, conservar sus resultados entre ciclos y permitir que el postulante consulte su nota individual (HU06, RF07–RF09). La calificación es determinista. Ranking, exportaciones y analítica se integran después mediante contratos internos del módulo, según C4 N3 y RF10–RF14.

## Contratos verificados

- Rendición publica en la cola durable `examen.finalizado` un evento `ExamenFinalizado` con `examenId`. La bandeja de salida permite reentregarlo y el identificador del mensaje corresponde al examen.
- La API interna de Rendición devuelve identificadores de examen, postulante y simulacro, y respuestas definitivas por número de pregunta, con alternativa nullable y revisión.
- Banco de Preguntas guarda el orden, contenido, curso y clave de cada pregunta en la versión congelada. Su consulta actual de claves devuelve preguntas ordenadas, pero recurre a la configuración vigente si falta la versión congelada. Resultados necesita una lectura interna estricta de la versión congelada que preserve el orden y permita asociar pregunta y curso. Cualquier ajuste será acotado al contrato interno del Banco y llevará regresión.
- No existe un contrato que suministre pesos, reglas académicas, escala ni ciclo al calificador.

## Criterios de aceptación

| Criterio | Comportamiento verificable | Fuente |
| --- | --- | --- |
| CA-PR01 | Un evento válido de cierre genera una calificación determinista solo a partir del examen definitivo, las claves congeladas y la regla aprobada. Un dato incongruente o una versión ausente no producen una nota parcial. | RF07, RC06, RC10, ADR-004, C4 N3–N4 |
| CA-PR02 | La calificación trata aciertos, errores y omisiones conforme a la regla aprobada. Se validan la precisión, la escala y los límites definidos, con casos de prueba representativos. | RF07–RF08, C4 N4 |
| CA-PR03 | Los resultados y su detalle se guardan de forma atómica en PostgreSQL. La unicidad por examen se mantiene con eventos repetidos y consumidores concurrentes. | RF09, RC07, RC16, ADR-015, C4 N4 |
| CA-PR04 | El worker confirma un mensaje procesable después de persistir el resultado o comprobar que ya existe. Las fallas quedan registradas y los mensajes recuperables pueden reintentarse tras una interrupción. | RC06, ADR-004, C4 N4 §3.3 |
| CA-PR05 | La API autenticada permite consultar la nota propia en cuanto queda disponible, distingue un intento propio pendiente de uno ajeno o inexistente y respeta la política aprobada de visibilidad. OpenAPI documenta el contrato. | RF08, RF20, AC01, AC04, ADR-007–008 |
| CA-PR06 | Los contratos internos permiten consultar resultados para clasificaciones e identificar desempeño y errores por pregunta y curso sin compartir tablas ni exponer claves por HTTP. | RF10–RF12, C4 N3 |
| CA-PR07 | Jest y el recorrido Compose verifican calificación, autorización, concurrencia, persistencia y recuperación. Se mide la latencia de la nota conforme a AC01 y se documentan las coberturas de líneas y ramas, con objetivos de 80 % y 70 %. | AC01, AC04, Sprint 2 |

## Decisiones académicas aprobadas

- **CA-PR01 y CA-PR02.** Una única regla asigna el mismo peso a todas las preguntas. El puntaje es (aciertos / total de preguntas congeladas) × 1000. Se requiere al menos una pregunta. Errores, preguntas sin marca y marcas borradas aportan cero puntos. La escala va de 0 a 1000 y no tiene umbral aprobatorio.
- **CA-PR02.** Se calcula con aritmética exacta y se redondea al centésimo más cercano al final; los empates suben al siguiente centésimo. Se usan centésimos enteros en el dominio y en persistencia. Todos los aciertos equivalen exactamente a 1000 puntos.
- **CA-PR01 y CA-PR03.** La regla se aplica a los eventos de intentos finalizados disponibles en la cola, sin ajustes por simulacro. Se consumen únicamente la versión congelada y las respuestas definitivas. Ediciones posteriores del Banco no alteran una calificación.
- **CA-PR05 y CA-PR06.** El postulante propietario puede ver el puntaje, los totales de aciertos, errores y omisiones y el desglose de estos conteos por curso al terminar el procesamiento. Mientras espera recibe un estado consultable. El detalle por pregunta se conserva para uso interno y las claves correctas permanecen en Banco. Ranking y Analítica se incorporarán en sus propios módulos.
