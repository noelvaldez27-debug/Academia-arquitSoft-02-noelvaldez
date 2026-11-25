# SDD · Analítica del Estudiante

SDD aprobada por el usuario. Alcance del Sprint 2: backend REST y datos para gráficos.

## Trazabilidad

- HU08, RF09 y RF11 requieren conservar el historial entre ciclos y mostrar desempeño por curso y evolución individual.
- HU09 y RF13 requieren identificar cursos débiles y generar recomendaciones de refuerzo. C4 niveles 1–3 y el diseño de patrones contemplan IA. ADR-010 y RC14 exigen usar ServicioIA y su adaptador simulado en pruebas.
- HU10 y RF12 requieren tasas de error grupales por pregunta y tema para docentes. La SDD del módulo 5 cubre agregados por curso asignado, pero no acredita el cumplimiento de RF12. RF12 se implementa en Analítica. Los temas sin evidencia histórica se identifican como no clasificados.
- RF20, AC04, RC15 y RC16 rigen autenticación, acceso, sede y conservación del historial. El acceso a reportes existentes se conserva bajo sus reglas actuales.
- ADR-001, ADR-002 y ADR-008 rigen límites modulares, capas y API REST. RC07 y ADR-015 rigen datos definitivos y migraciones. RC05 y RC06 asignan Redis a la rendición y RabbitMQ a puntajes y rankings. C4 nivel 3 describe tanto consulta de resultados disponibles como acceso a tablas propias de Analítica. El diseño de patrones plantea Observer cuando sea necesario. Analítica consulta las estadísticas y persiste las recomendaciones y su trazabilidad.
- AC01 protege la entrega de la nota individual. AC02, AC03 y AC08 orientan la disponibilidad, el costo y el crecimiento. AC05 exige preservar límites modulares. AC06 orienta la estructura de datos de los gráficos del Sprint 3. La validación integral con k6 corresponde a una fase posterior.
- El diseño interno no detalla el módulo 6. La composición propuesta en src/modules/analitica/ conecta los puertos de aplicación con adaptadores de infraestructura y rutas Express. El dominio contiene las reglas estadísticas aprobadas y la raíz de composición inyecta los contratos públicos.

## Fuentes y límites

| Propietario | Contrato o dato verificado | Uso propuesto |
| --- | --- | --- |
| Usuarios | MiddlewareAutenticacion, roles y consulta pública de usuarios | Identidad del JWT y verificación de cuenta activa. La sede actual no sustituye una sede histórica faltante. |
| Resultados | ConsultaResultadosInterna.porPostulante y porSimulacro, paginados por examenId de 100 en 100 | Nota definitiva en centésimos, conteos por curso y corrección congelada por pregunta. Para la evolución falta fecha de cierre. La salida individual omite el detalle por pregunta. |
| Rendición | consultasReportes.porSimulacro, con inicio, cierre y dimensiones históricas si existen | Cierre del intento como fecha del historial. Para el historial individual se propone una consulta pública por lote de IDs de examen, limitada al postulante. |
| Banco de Preguntas | ConsultaSimulacros y claves congeladas. Banco ya controla asignaciones docentes por curso | Metadatos del simulacro y nombres de curso si están disponibles por contrato público. Para RF12 se conserva la versión congelada de cada pregunta y se añade la referencia de tema en nuevas versiones cuando haya clasificación verificable. Analítica no consume claves. |
| Ranking y Reportes | Ranking definitivo y reportes con autorización propia. Sin contrato público de datos para Analítica | No se requiere para la consulta individual. Los agregados docentes existentes siguen sujetos a sus asignaciones. |

Se reutilizan la nota de 0 a 1000, los conteos congelados y la regla de cero puntos para errores y omisiones. Se aplica el mismo criterio a libres y matriculados. Los cambios posteriores del Banco no recalifican los intentos. No se generan inscripciones ni dimensiones históricas.

## Reglas aprobadas

1. **Historial.** Una observación por simulacro válido y calificado, ordenada por cierre del intento. Incluye simulacro, fecha, nota definitiva de 0 a 1000 y conteos de respuestas. Sin calificaciones, la lista queda vacía. La primera versión ofrece evolución por simulacro.
2. **Desempeño.** Calcular correctas sobre correctas más incorrectas más omitidas. Sumar los conteos de cada curso antes de dividir para dar igual peso a cada pregunta. Mostrar dos decimales con mitad hacia arriba. Omitir cursos sin evaluaciones y conservar el cero de los cursos evaluados sin aciertos. Las estadísticas se basan en resultados y cursos congelados.
3. **Prioridades.** Seleccionar hasta tres cursos con al menos cinco evaluaciones y menos del 60 % de aciertos. Comparar fracciones exactas antes de redondear, ordenar por porcentaje ascendente, mayor número de evaluaciones e ID estable. Distinguir evidencia insuficiente de ausencia de prioridades. La selección no modifica la nota ni define aprobación, fortalezas o probabilidad de ingreso.
4. **Recomendaciones.** Generar por solicitud explícita, con ServicioIA y solo datos académicos mínimos. Gemini redacta refuerzo, repaso y ejercicios a partir de prioridades calculadas en el backend. Sin proveedor disponible o con respuesta inválida, usar plantilla local y declarar el origen. Aplicar tiempos de espera, registrar fallos sin datos sensibles y deduplicar solicitudes concurrentes. Reutilizar por postulante, huella de resultados definitivos y versión de reglas. Persistir fecha, huella, versión, cursos seleccionados, contenido, origen y vigencia. Un nuevo resultado invalida la recomendación para la siguiente solicitud. Toda prueba utiliza IA simulada. Una llamada real durante desarrollo requiere autorización explícita.
5. **RF12.** Agrupar intentos definitivos por pregunta en su versión histórica y por tema histórico dentro de su curso. Ofrecer filtros por simulacro, curso, tema y sede histórica. Contar exposiciones válidas, aciertos, errores y omisiones, y dividir cada conteo por el total de exposiciones en su grupo. Las omisiones tienen su propia tasa. Conservar registros sin tema bajo la clasificación desconocida. No reconstruir temas usando el Banco actual o IA. Separar versiones con cambios relevantes en contenido o clave. No exponer claves ni respuestas individuales.
6. **Autorización.** Postulante con acceso a historial, evolución, desempeño y recomendación propios. Docente con agregados de sus cursos asignados. Administrador de sede con agregados de su sede histórica, excluyendo sede desconocida. Administrador general con agregados de todas las sedes, incluida información histórica incompleta identificada como tal. Los administradores no reciben analítica individual ni recomendaciones.
7. **Actualización.** Los nuevos resultados aparecen en la siguiente consulta. Consultar fuentes definitivas mediante operaciones por lote y sin recalificar. Usar tablas de Analítica para recomendaciones, sin proyección estadística, Redis o worker adicional en esta versión.

## Criterios de aceptación

El catálogo de temas pertenece al Banco. Cada tema tiene ID estable, curso, nombre único dentro del curso y estado activo. El administrador general gestiona el catálogo. La asignación es opcional y conserva los permisos y la revalidación de preguntas y propuestas. El congelamiento conserva el ID y nombre verificados en ese momento. Las versiones antiguas sin tema se informan como no clasificadas. RF13 puede utilizar los temas históricos disponibles como contexto académico complementario.

- CA-AE01 (HU08, RF09, RF11). Con cero, uno o varios simulacros se devuelve el historial propio con orden y fechas verificables. Los puntajes coinciden con Resultados, incluidos 0 y 1000. Se pueden consumir las series desde el futuro frontend.
- CA-AE02 (HU08, RF11). Los conteos y porcentajes por curso respetan las reglas aprobadas. Se prueban denominadores distintos, redondeo, ceros y cursos sin evaluación. Editar el Banco no altera estadísticas históricas.
- CA-AE03 (HU09, RF13). Las debilidades y recomendaciones se ajustan a los criterios aprobados y funcionan con el adaptador simulado. Se comprueban el umbral, el mínimo de evidencia, los desempates, la ausencia de prioridades, la renovación, la concurrencia y el mecanismo alternativo.
- CA-AE04 (RF20, AC04, RC15). Se valida el rol y el propietario en el servidor y se comprueban cuentas inactivas, accesos ajenos y permisos por sede y curso cuando apliquen. Las respuestas no incluyen claves ni datos personales ajenos al uso.
- CA-AE05 (HU10, RF12). Los roles autorizados reciben tasas agrupadas por curso, pregunta y tema dentro de su alcance histórico. Se verifican versiones, filtros y restricciones docentes. Se conserva el aislamiento y se distingue la falta de metadatos históricos.
- CA-AE06 (AC01, AC05, AC08). Un resultado nuevo aparece conforme a la estrategia aprobada, sin duplicaciones. Se documentan rutas en OpenAPI, regresión Jest y métricas reales, y se comprueban los flujos críticos en Docker Compose con IA simulada. Objetivos locales de cobertura: 80 % de líneas y 70 % de ramas.
