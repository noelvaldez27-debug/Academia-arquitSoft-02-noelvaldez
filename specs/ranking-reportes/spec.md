# SDD · Ranking y Reportes

Estado: reglas de negocio aprobadas. Las dependencias autorizadas se detallan al final.

## Alcance confirmado

- RF10 y C4 nivel 3 definen el ranking por simulacro en los ámbitos general, por carrera y por sede. HU07 pide que el postulante pueda ver su posición.
- HU11 pide reportes de inscripción y participación. RF14 pide exportar resultados y cuadro de méritos. Actores y HU14 contemplan la consulta docente de reportes académicos.
- Resultados es la fuente de puntajes definitivos. Se conserva la escala de 0 a 1000 y la precisión de `puntajeCentesimos`. El módulo no vuelve a calificar ni aplica penalizaciones.
- AC04, RC15 y ADR-007 exigen proteger los datos y aplicar los límites de rol y sede. El administrador general tiene alcance global y el de sede opera exclusivamente dentro de su sede.

## Diseño e integración

El módulo se ubica en `src/modules/ranking-reportes/` con Dominio, Aplicación, Infraestructura, Presentación y raíz de composición (ADR-001 y ADR-002). Lee puntajes paginados mediante `ConsultaResultadosInterna.porSimulacro` y datos históricos mediante la consulta paginada de Rendición. Rendición obtiene los datos vigentes de Usuarios al iniciar el intento y persiste su instantánea. Las cargas masivas ya encoladas antes de la migración se procesan con condición no determinada cuando carecen de un valor.

El cálculo corre en segundo plano mediante RabbitMQ (RC06 y ADR-004). El worker detecta cambios comparando los totales persistidos de intentos, finalizaciones y calificaciones y el estado de cierre con la proyección vigente. Publica el identificador del simulacro y confirma el consumo tras persistir la proyección en PostgreSQL. Una interrupción deja la diferencia detectable para el siguiente ciclo. Los trabajos duplicados reconstruyen desde las fuentes vigentes bajo un bloqueo por simulacro. PostgreSQL conserva la proyección definitiva (RC07, ADR-015 y C4 niveles 2–3). La implementación inicial consulta esa proyección directamente.

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

## Dependencias verificadas y solución aprobada

- **CA-RR01 y CA-RR04.** Usuarios incorpora MATRICULADO y LIBRE como condición académica, con asignación explícita en altas nuevas y gestión del administrador general o de la sede propia. Las cuentas previas sin evidencia conservan condición no determinada y acceso normal. Rendición congela carrera, sede y condición al iniciar. Los intentos históricos conservan sus resultados y solo incluyen dimensiones demostrables. Participan en el ranking general y en los ámbitos específicos cuyo dato se conoce.
- **CA-RR02.** El administrador general solicita el cierre. Se registra el responsable, la fecha de solicitud y la fecha efectiva. Las solicitudes son idempotentes y se coordinan con el inicio concurrente. El estado en cierre bloquea nuevas altas y permite reanudar y finalizar intentos existentes. El estado cerrado requiere todos los intentos válidos finalizados y calificados. Una interrupción del procesamiento mantiene pendiente el cierre. Ranking consulta el estado del propietario. Sin reapertura ni horarios adicionales.
- **CA-RR04.** La inscripción por simulacro se informa como no disponible. Se contabilizan por separado participantes, intentos activos, intentos finalizados e intentos calificados.
- **CA-RR03 y CA-RR04.** El administrador general gestiona la relación muchos a muchos entre docentes y cursos existentes. Las asignaciones preexistentes requieren evidencia verificable. Cada docente accede solo a agregados de sus cursos asignados. La autoría de separatas sigue sus propias reglas.
- La aclaración sobre área resuelve la discrepancia señalada con el C3 anterior. El texto C4 nivel 3 del repositorio ya coincide con RF10.

## Evidencia local

- TypeScript y Jest aprobaron 413 pruebas en 77 suites. Cobertura de Ranking y Reportes: 91,86 % de líneas (271/295) y 78,74 % de ramas (137/174). Cobertura global: 89,19 % de líneas y 83,22 % de ramas.
- El recorrido de Docker Compose aislado con PostgreSQL, Redis y RabbitMQ verificó ranking provisional y definitivo, duplicados, empates, filtro combinado, datos históricos tras cambios y desactivación, asignación y retiro de cursos, reportes y Excel. La carrera concurrente produjo HTTP 200 en un recorrido y 409 en otro. Ambos resultados respetaron la inscripción de intentos bajo el bloqueo de cierre.
- En el recorrido final, el primer sondeo exitoso de la nota ocurrió a 1,054 s y el del puesto a 2,902 s desde el cierre del intento. Son mediciones de un flujo local. La regresión de Resultados en Compose confirmó su nota y contrato.
- Al detener RabbitMQ, el cierre general permaneció pendiente. Tras restablecerlo, se procesó la nota y se publicó el ranking definitivo. La verificación incremental aplicó las migraciones 009 a 014 sobre una cuenta, un intento y un resultado sintéticos creados con el esquema 008. Los datos preexistentes se conservaron y los atributos históricos ausentes quedaron nulos.
- Si una actualización excepcional sustituye una proyección definitiva, PostgreSQL conserva la versión previa y las fechas de publicación y sustitución en la misma transacción. No se ofrece una operación de reapertura o de edición manual.
- Las pruebas HTTP verificaron el aislamiento entre sedes en consultas y exportaciones, el acceso exclusivo al puesto propio y el acceso docente a agregados de sus cursos asignados. La reproducción de mensajes de ranking en Compose conservó una única clasificación por ámbito.

## Integración y cierre

- Gestión de Usuarios registra la condición en las altas individuales y masivas, permite cambiarla según rol y sede, y conserva las cuentas anteriores sin condición verificable.
- Banco de Preguntas administra asignaciones docentes con el catálogo existente y permite verificar la existencia del simulacro al solicitar el cierre.
- Rendición de Examen conserva la instantánea de carrera, sede y condición al iniciar. Gestiona el cierre general y la reanudación de intentos activos.
- Procesamiento de Resultados expone sus consultas de calificaciones y totales para validar el cierre y detectar cambios. Ranking reutiliza el puntaje en centésimos en la escala de 0 a 1000, sin penalizaciones.
- GitHub Actions compiló el commit `5458167` con Node.js 20 y ejecutó Jest con cobertura. [Ejecución 45663589106](https://github.com/noelvaldez27-debug/Academia-arquitSoft-02-noelvaldez/actions/runs/45663589106)
