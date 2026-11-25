# SDD · Analítica del Estudiante

Estado pendiente de aprobación. Alcance del Sprint 2: backend REST y datos para gráficos.

## Trazabilidad

- HU08, RF09 y RF11 requieren conservar el historial entre ciclos y mostrar desempeño por curso y evolución individual.
- HU09 y RF13 requieren identificar cursos débiles y generar recomendaciones de refuerzo. C4 niveles 1–3 y el diseño de patrones contemplan IA. ADR-010 y RC14 exigen usar ServicioIA y su adaptador simulado en pruebas.
- HU10 y RF12 requieren tasas de error grupales por pregunta y tema para docentes. La SDD del módulo 5 cubre agregados por curso asignado, pero no acredita el cumplimiento de RF12. El alcance y la fuente histórica de temas requieren aprobación.
- RF20, AC04, RC15 y RC16 rigen autenticación, acceso, sede y conservación del historial. El acceso a reportes existentes se conserva bajo sus reglas actuales.
- ADR-001, ADR-002 y ADR-008 rigen límites modulares, capas y API REST. RC07 y ADR-015 rigen datos definitivos y migraciones. RC05 y RC06 asignan Redis a la rendición y RabbitMQ a puntajes y rankings. C4 nivel 3 describe tanto consulta de resultados disponibles como acceso a tablas propias de Analítica. El diseño de patrones plantea Observer cuando sea necesario. Falta confirmar la estrategia de persistencia de Analítica.
- AC01 protege la entrega de la nota individual. AC02, AC03 y AC08 orientan la disponibilidad, el costo y el crecimiento. AC05 exige preservar límites modulares. AC06 orienta la estructura de datos de los gráficos del Sprint 3. La validación integral con k6 corresponde a una fase posterior.
- El diseño interno no detalla el módulo 6. La composición propuesta en src/modules/analitica/ conecta los puertos de aplicación con adaptadores de infraestructura y rutas Express. El dominio contiene las reglas estadísticas aprobadas y la raíz de composición inyecta los contratos públicos.

## Fuentes y límites

| Propietario | Contrato o dato verificado | Uso propuesto |
| --- | --- | --- |
| Usuarios | MiddlewareAutenticacion, roles y consulta pública de usuarios | Identidad del JWT y verificación de cuenta activa. La sede actual no sustituye una sede histórica faltante. |
| Resultados | ConsultaResultadosInterna.porPostulante y porSimulacro, paginados por examenId de 100 en 100 | Nota definitiva en centésimos, conteos por curso y corrección congelada por pregunta. Para la evolución falta fecha de cierre. La salida individual omite el detalle por pregunta. |
| Rendición | consultasReportes.porSimulacro, con inicio, cierre y dimensiones históricas si existen | Cierre del intento como fecha propuesta. Para el historial individual se propone una consulta pública por lote de IDs de examen, limitada al postulante. |
| Banco de Preguntas | ConsultaSimulacros y claves congeladas. Banco ya controla asignaciones docentes por curso | Metadatos del simulacro y nombres de curso si están disponibles por contrato público. Para RF12 se necesita comprobar o definir una fuente verificable de temas históricos. Analítica no consume claves. |
| Ranking y Reportes | Ranking definitivo y reportes con autorización propia. Sin contrato público de datos para Analítica | No se requiere para la consulta individual. Los agregados docentes existentes siguen sujetos a sus asignaciones. |

Se reutilizan la nota de 0 a 1000, los conteos congelados y la regla de cero puntos para errores y omisiones. Se aplica el mismo criterio a libres y matriculados. Los cambios posteriores del Banco no recalifican los intentos. No se generan inscripciones ni dimensiones históricas.

## Decisiones para aprobación

1. **Historial y evolución.** Propuesta: una observación por simulacro calificado, con fecha de cierre de Rendición, orden cronológico, nota definitiva y conteos. Omitir tendencias semanales o mensuales en la primera versión. Si se requieren, confirmar frecuencia, zona horaria, límites del periodo y métrica.
2. **Desempeño por curso.** Propuesta: porcentaje de correctas sobre todas las preguntas evaluadas del curso, con incorrectas y omitidas diferenciadas y ambas en el denominador. Para varios simulacros, sumar aciertos y preguntas antes de dividir, dando el mismo peso a cada pregunta. Presentar dos decimales con redondeo a la mitad hacia arriba. Confirmar si se quiere igual peso por simulacro u otros resúmenes.
3. **Debilidades y recomendaciones.** RF13 es obligatorio. Confirmar criterio para seleccionar cursos débiles, empates, mínimo de evidencia y si se deben etiquetar fortalezas. Confirmar cuándo generar la recomendación, cuándo renovarla y qué responder si el proveedor no está disponible. Se propone enviar a ServicioIA los cursos seleccionados sin identificadores personales.
4. **Visibilidad y RF12.** Propuesta: historial, desempeño y recomendaciones solo para el postulante autenticado. Docentes con agregados de sus cursos asignados. Confirmar si RF12 se implementa en este módulo o como extensión del módulo 5. Definir grupo y sede, denominador y tratamiento de omisiones, agrupación por tema y fuente histórica verificable. Confirmar si existe un permiso administrativo específico para analítica individual y cómo se aplicaría a la sede histórica.
5. **Ausencia y actualización.** Propuesta: historial vacío para un postulante sin calificaciones, sin porcentajes ni recomendaciones. Un curso no evaluado queda ausente. Cero se reserva para un curso evaluado sin aciertos. Leer resultados confirmados en la siguiente consulta, con paginación y consultas por lote, sin depender del ranking. Confirmar si las tablas propias del C4 se reservan para recomendaciones o si también se exige una proyección estadística. La propuesta inicial no requiere Redis ni un nuevo worker para las consultas.

## Criterios de aceptación

- CA-AE01 (HU08, RF09, RF11). Con cero, uno o varios simulacros se devuelve el historial propio con orden y fechas verificables. Los puntajes coinciden con Resultados, incluidos 0 y 1000. Se pueden consumir las series desde el futuro frontend.
- CA-AE02 (HU08, RF11). Los conteos y porcentajes por curso respetan las reglas aprobadas. Se prueban denominadores distintos, redondeo, ceros y cursos sin evaluación. Editar el Banco no altera estadísticas históricas.
- CA-AE03 (HU09, RF13). Las debilidades y recomendaciones se ajustan a los criterios aprobados y funcionan con el adaptador simulado. Se comprueba ausencia de evidencia y fallo del proveedor.
- CA-AE04 (RF20, AC04, RC15). Se valida el rol y el propietario en el servidor y se comprueban cuentas inactivas, accesos ajenos y permisos por sede y curso cuando apliquen. Las respuestas no incluyen claves ni datos personales ajenos al uso.
- CA-AE05 (HU10, RF12, pendiente de asignación). El docente autorizado recibe tasas agrupadas por pregunta y tema conforme a las reglas aprobadas. Se conserva el aislamiento y se distingue la falta de metadatos históricos.
- CA-AE06 (AC01, AC05, AC08). Un resultado nuevo aparece conforme a la estrategia aprobada, sin duplicaciones. Se documentan rutas en OpenAPI, regresión Jest y métricas reales, y se comprueban los flujos críticos en Docker Compose con IA simulada. Objetivos locales de cobertura: 80 % de líneas y 70 % de ramas.
