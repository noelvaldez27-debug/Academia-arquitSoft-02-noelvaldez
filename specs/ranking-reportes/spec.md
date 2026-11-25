# SDD · Ranking y Reportes

Estado: borrador pendiente de aprobación académica y funcional.

## Alcance confirmado

- RF10 y C4 nivel 3 definen el ranking por simulacro en los ámbitos general, por carrera y por sede. HU07 pide que el postulante pueda ver su posición.
- HU11 pide reportes de inscripción y participación. RF14 pide exportar resultados y cuadro de méritos. Actores y HU14 contemplan la consulta docente de reportes académicos.
- Resultados es la fuente de puntajes definitivos. Se conserva la escala de 0 a 1000 y la precisión de `puntajeCentesimos`. El módulo no vuelve a calificar ni aplica penalizaciones.
- AC04, RC15 y ADR-007 exigen proteger los datos y aplicar los límites de rol y sede. Actores concede explícitamente la exportación de resultados y cuadro de méritos al administrador general.

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

## Decisiones que requieren aprobación

1. **Clasificación.** Confirmar orden descendente por el puntaje definitivo en centésimos. Definir criterios y orden de desempate y qué puestos se asignan en un empate total, incluido el puesto siguiente.
2. **Ámbitos.** RF10 indica general, por carrera y por sede. Confirmar si área es un cuarto ranking o si se mantiene RF10. Si se incorpora, definir el catálogo, su fuente y la relación con carreras. Confirmar si carrera y sede se consultan por separado o también combinadas, y en qué momento se fijan esos datos para el historial.
3. **Participación.** Confirmar si matriculados y libres compiten juntos, por separado o tienen distinta elegibilidad. Si son categorías, definir su fuente y cuándo se fija la condición. Confirmar si los resultados históricos de cuentas desactivadas siguen contando.
4. **Actualización y publicación.** Precisar si se publica una clasificación provisional conforme llegan resultados o si se espera al cierre y a todas las calificaciones. Definir cuándo queda definitiva y qué ocurre con resultados que llegan tarde.
5. **Visibilidad y permisos.** Definir si el postulante ve solo su puesto o también filas de otros postulantes, y qué datos aparecen. Confirmar qué reportes y consultas corresponden a docentes, su ámbito y si ven datos individuales. Confirmar qué consultas y exportaciones puede hacer un administrador de sede dentro de su sede. El administrador general tiene la exportación explícita de RF14.
6. **Reportes y exportación.** Definir qué se cuenta como inscripción y como participación, el alcance de los reportes docentes, los filtros, campos permitidos y formatos de archivo para cada salida, y si el cuadro de méritos comprende todo el ranking o un subconjunto.
