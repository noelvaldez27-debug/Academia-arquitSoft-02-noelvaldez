# SDD · Ranking y Reportes

Estado: reglas de negocio aprobadas. Las dependencias sin fuente se detallan al final.

## Alcance confirmado

- RF10 y C4 nivel 3 definen el ranking por simulacro en los ámbitos general, por carrera y por sede. HU07 pide que el postulante pueda ver su posición.
- HU11 pide reportes de inscripción y participación. RF14 pide exportar resultados y cuadro de méritos. Actores y HU14 contemplan la consulta docente de reportes académicos.
- Resultados es la fuente de puntajes definitivos. Se conserva la escala de 0 a 1000 y la precisión de `puntajeCentesimos`. El módulo no vuelve a calificar ni aplica penalizaciones.
- AC04, RC15 y ADR-007 exigen proteger los datos y aplicar los límites de rol y sede. El administrador general tiene alcance global y el de sede opera exclusivamente dentro de su sede.

## Diseño e integración

El módulo se ubica en `src/modules/ranking-reportes/` con Dominio, Aplicación, Infraestructura, Presentación y raíz de composición (ADR-001 y ADR-002). Lee puntajes paginados mediante `ConsultaResultadosInterna.porSimulacro`, y sede y carrera mediante `ServicioConsultaUsuarios.consultarPorId`. El puerto de Usuarios no incluye área, modalidad de participación ni listados de inscritos. Los reportes que requieran datos adicionales dependerán de extensiones mínimas a los contratos públicos de los módulos propietarios.

El cálculo del ranking corre en segundo plano mediante RabbitMQ (RC06 y ADR-004). El worker actual de Resultados persiste calificaciones idempotentes y no emite un evento de resultado confirmado. La implementación deberá garantizar que una calificación persistida pueda incorporarse al ranking aunque el broker o el worker se interrumpan. PostgreSQL conserva los datos definitivos (RC07, ADR-015 y C4 niveles 2–3). El patrón Decorator permite añadir Redis a lecturas frecuentes cuando se justifique. Si se incorpora, PostgreSQL seguirá siendo la fuente definitiva y se verificará la recuperación de lecturas ante fallos o invalidaciones.

## Criterios de aceptación

| ID | Criterio | Fuente |
| --- | --- | --- |
| CA-RR01 | El ranking por simulacro clasifica puntajes definitivos en los ámbitos general, por carrera y por sede. Ante empates y cambios de datos, aplica de forma determinista las reglas aprobadas en todos los ámbitos. | RF10, HU07, C4 N3 |
| CA-RR02 | La generación asíncrona admite entregas duplicadas, concurrencia y reintentos sin perder resultados ni publicar posiciones que incumplan las reglas aprobadas. Un fallo recuperable converge al estado correcto al restablecer la infraestructura. | AC01, RC06–07, ADR-004 |
| CA-RR03 | Las consultas JWT respetan la matriz aprobada de rol, sede, visibilidad y publicación. El postulante autorizado puede consultar su posición. OpenAPI documenta las respuestas y estados. | HU07, AC04, RC15, ADR-007–008 |
| CA-RR04 | Los reportes de inscripción y participación y las exportaciones de resultados y cuadro de méritos se verifican contra las definiciones, filtros, campos, formatos y permisos aprobados. | HU11, HU14, RF14, AC04 |
| CA-RR05 | Jest y Docker Compose verifican el recorrido desde el resultado hasta la consulta y exportación, incluyendo duplicados, fallos y recuperación. Se registra la cobertura y se mide el tiempo hasta la disponibilidad del ranking y el efecto sobre la consulta de nota individual. | AC01, Sprint 2 |


## Aclaraciones de negocio aprobadas

- CA-RR01. Orden descendente por puntaje definitivo en centésimos (0 a 100 000). Los empates usan puestos de competición (1, 2, 2, 4). El identificador estable ordena la presentación entre empatados. Tiempo, entrega, edad y DNI no intervienen. Los ámbitos son general, carrera y sede, con filtro combinado por carrera y sede. Se excluyen área y curso. Los datos de carrera, sede y condición se congelan al iniciar el intento. Compiten juntos matriculados y libres con intentos válidos, cerrados y calificados. Se conservan los resultados históricos de cuentas desactivadas.
- CA-RR02. El ranking se actualiza con cada resultado válido, incluidos los tardíos por fallos técnicos. Permanece provisional hasta que cierre la rendición general y todos los intentos válidos estén calificados. Cualquier corrección excepcional de un ranking definitivo requiere trazabilidad.
- CA-RR03. El postulante consulta solo su puntaje, puesto, total de participantes y estado de publicación en sus ámbitos. El docente consulta agregados de sus cursos asignados. El administrador de sede consulta y exporta exclusivamente dentro de su sede. El administrador general consulta y exporta en todos los ámbitos. Los permisos y filtros se aplican también a las descargas. Se excluyen credenciales, claves y datos personales innecesarios.
- CA-RR04. Inscripción requiere un registro válido del simulacro. Participación corresponde al inicio de un intento válido. Finalización corresponde al cierre voluntario o por vencimiento y calificación al resultado procesado. Los reportes filtran por simulacro, carrera, sede, condición y fechas cuando corresponda. Las filas incluyen, según el reporte y el rol, simulacro, identificador del postulante, carrera, sede, condición, puntaje sobre 1000, aciertos, errores, omisiones, puesto y estado. El cuadro de méritos incluye todos los resultados válidos del ámbito, ordenados por puesto, sin cupos ni nota mínima. El formato inicial es Excel (.xlsx).
- CA-RR05. Validar también límites de puntaje, empates, filtros combinados, conservación histórica, resultados tardíos, aislamiento y equivalencia entre consulta y exportación. Los objetivos recomendados son 80 % de líneas y 70 % de ramas del módulo.

## Dependencias verificadas

- Usuarios expone carrera y sede actuales. Su esquema y contrato carecen de condición de matriculado o libre. Hace falta aprobar su fuente y el tratamiento de registros existentes. El historial de intentos previos carece de una copia verificable de carrera, sede y condición al inicio.
- Rendición guarda inicio, vencimiento y cierre por intento. Banco configura duración por intento y congela la versión del examen. No existe cierre general; la transición a definitivo queda pendiente de una fuente aprobada.
- No existe una entidad de inscripción a un simulacro. Se aplica la limitación aprobada y no se derivan inscripciones de la matrícula ni de los intentos.
- No existe un contrato de asignación docente a cursos. Las separatas registran autor y curso, pero no acreditan una asignación académica. El acceso docente depende de una fuente autorizada.
- La aclaración sobre área resuelve la discrepancia señalada con el C3 anterior. El texto C4 nivel 3 del repositorio ya coincide con RF10.
