# Inventario de pantallas

Los verbos se aplican al prefijo del módulo: U = /api/usuarios, B = /api/banco-preguntas, E = /api/v1/examenes, R = /api/v1/resultados, Q = /api/v1/rankings y A = /api/v1/analitica. AG significa administrador general, AS administrador de sede, D docente y P postulante. Las autorizaciones de AS siempre se limitan a su sede. Los CA remiten a la SDD del módulo o de validación. Cada fila indica el comportamiento visible que se verificará.

## Comunes

| Pantalla y rol | Módulo · RF · HU | Función y REST | Carga · error · vacío | Dependencia y aceptación |
| --- | --- | --- | --- | --- |
| Inicio de sesión · todos | U · RF20 · HU20 | Formulario, POST /login | Validando · acceso inválido genérico · formulario inicial | F0. CA-U05/06: deriva a su rol o a cambio inicial. |
| Cambio inicial y cuenta · todos autenticados según estado | U · RF02/26 · HU02/21/22 | PATCH /password; PATCH /correo solo AG/AS | Guardando · credencial/validación/conflicto · formulario vacío | Sesión. CA-U08/09, CA-VS01: exige cambio provisional antes del menú y confirma cambios permitidos. |
| Inicio por rol, acceso restringido y sesión vencida · todos | U · RF20 · HU20 | Marco, navegación, salida local y retorno a POST /login | Acceso por resolver · 401/403 · ruta inexistente o sin acciones autorizadas | Sesión y guardas. CA-U06: respeta accesos directos y elimina vistas privadas al salir. |

## Administrador general y administrador de sede

| Pantalla y rol | Módulo · RF · HU | Función y REST | Carga · error · vacío | Dependencia y aceptación |
| --- | --- | --- | --- | --- |
| Usuarios y estudiantes · AG/AS | U · RF23/24 · HU16–18 | GET raíz y /sedes; PATCH /{id}/desactivar y /{id}/reactivar; PATCH /estudiantes/{id}/condicion; POST /estudiantes/archivar | Listando/guardando · acceso, conflicto o archivo bloqueado · filtro sin coincidencias | Sesión y sedes. CA-U10/11, CA-VS01/02: paginación, acciones según rol, archivo individual o lote y control de intento activo. |
| Alta, recuperación y entrega individual · AG/AS | U · RF01/02/22 · HU01/02/16 | GET /sedes y /ciclos; POST /estudiantes; POST /estudiantes/{id}/credenciales | Guardando/descargando · DNI existente o entrega consumida/vencida · formulario sin completar | Sedes y ciclos. CA-U01/02, CA-VS01: recuperación explícita para nuevo ciclo, conserva identidad y entrega por el administrador autorizado. |
| Importación Excel y seguimiento · AG/AS | U · RF21/22 · HU02/15/16 | GET /sedes y /ciclos; POST /cargas-masivas; GET /cargas-masivas/{id}; POST /cargas-masivas/{id}/credenciales | Subiendo/en cola · formato, filas inválidas o entrega no disponible · sin filas procesables/entrega | Sedes, ciclo y referencia de carga. CA-U13, CA-VS01/04: modalidad explícita, resumen por fila, omisiones y descarga temporal. |
| Ciclos académicos · AG/AS | U · RF09/24 revisados · HU01/08/18 | GET /ciclos para ambos; POST /ciclos y /ciclos/{id}/cierre solo AG | Consultando/cerrando · fechas o intentos pendientes · sin ciclos | U y estado en E. CA-VS02/04: conserva historial, muestra bloqueo y limita cambios a AG. |
| Ranking administrativo · AG/AS | Q · RF10 · HU07/11 | GET /{simulacroId}, filtros sede/carrera permitidos | Consultando/publicación pendiente · contexto o permiso inválido · sin posiciones | ID de simulacro y publicación. CA-RR01/03: tabla de posiciones que respeta ámbito y visibilidad. |
| Participación, resultados y cuadro de méritos · AG/AS | Q · RF14 · HU11 | GET /{simulacroId}/reportes/{tipo}, tipo participacion/resultados/meritos; descarga con formato=xlsx | Consultando/descargando · filtro/permiso · sin resultados, tasa cero y padrón desconocido diferenciados | Simulacro, sede y padrón histórico. CA-RR04, CA-VS03: filtros, denominador aplicable y Excel en su alcance. |
| Estadísticas académicas · AG/AS | A · RF12/20 · HU10 como origen del agregado | GET /estadisticas | Consultando · filtros o permiso · sin exposiciones o tema sin clasificar | Curso, simulacro y sede según filtro. CA-AE04/05: tasas y denominadores históricos sin claves de evaluación. |

## Exclusivas del administrador general

| Pantalla y rol | Módulo · RF · HU | Función y REST | Carga · error · vacío | Dependencia y aceptación |
| --- | --- | --- | --- | --- |
| Alta de docente · AG | U · RF19 · HU14 | POST /docentes | Guardando · DNI inválido/duplicado · formulario inicial | Usuarios. CA-U03: alta con modelo de credencial docente aprobado. |
| Alta de administrador de sede · AG | U · RF25 · HU19 | GET /sedes; POST /administradores-sede | Guardando · correo duplicado/sede inválida · sin sedes | Sedes. CA-U04/12: solo alta de administradores de sede; administrador general inicial por seed. |
| Sedes · AG | U · RF22 · HU01/19 | GET y POST /sedes | Listando/guardando · nombre duplicado · sin sedes | U. CA-U14: sede nueva disponible para altas sin cambios de código. |
| Curso, temas y asignaciones · AG | B · RF03/12/20 · HU03/10 | POST /cursos; GET/POST /cursos/{cursoId}/temas; PUT /temas/{id}; PATCH /temas/{id}/desactivar; PUT/DELETE /cursos/{cursoId}/docentes/{docenteId}; GET raíz U con filtro docente | Consultando/guardando · conflicto · curso sin temas | ID de curso y docentes de U. CA-BP01, CA-RR03/04, CA-AE05: temas y asignaciones autorizados; histórico se conserva. |
| Banco por curso y editor de preguntas · AG | B · RF03 · HU03 | GET/POST /cursos/{cursoId}/preguntas; PUT /preguntas/{id} | Consultando/guardando · opciones inválidas o conflicto · sin preguntas | Curso/temas. CA-BP01/06: cinco alternativas, una correcta, sin alterar versiones congeladas. |
| Configuración y gestión del simulacro · AG | B/E · RF03/04/07 · HU03/04/11 | POST /simulacros, GET/PUT /simulacros/{id} (B); POST /simulacros/{id}/habilitar y /simulacros/{id}/cierre (E) | Guardando/habilitando/cerrando · conflicto de estado · sin preguntas o padrón vacío | Preguntas, ciclo y padrón. CA-RE02/05, CA-VS03, CA-RR02: orden, duración y versión, padrón confirmado y cierre con procesamiento pendiente. |
| Autorización de separata · AG | B · RF15–18 · HU12/13 | GET /separatas/{id} y /separatas/{id}/archivo; PUT /separatas/{id}/autorizacion | Consultando/guardando · archivo o autorización no disponible · sin autorización | Referencia de separata. CA-BP03–06 y ADR-009–011: registrar alcance autorizado; revisión humana antes de incorporar. |

## Docente y revisión compartida

| Pantalla y rol | Módulo · RF · HU | Función y REST | Carga · error · vacío | Dependencia y aceptación |
| --- | --- | --- | --- | --- |
| Subir separata · D | B · RF15–17 · HU12 | POST /cursos/{cursoId}/separatas | Subiendo/procesando · formato/tamaño/error de extracción · sin archivo | Curso conocido. CA-BP02–04: DOCX, PDF, JPEG/JPG y PNG; máximo inicial configurable de 20 MB; confirma antes de procesar. |
| Estado, archivo y revisión de propuestas · D propietario, AG según acción | B · RF16–18/03 · HU12/13 | GET /separatas/{id} y /separatas/{id}/archivo; PUT /propuestas/{id}; POST /propuestas/{id}/aprobar o /descartar | Procesando/guardando · error de extracción/propuesta o permiso · sin propuestas | Separata y autorización. CA-BP03–06: edición y descarte según permiso; aprobación solo del docente responsable, reevaluación tras cambios cuando corresponda. |
| Desempeño del grupo · D | Q/A · RF12 · HU10 | GET /{simulacroId}/reportes/cursos/{cursoId} (Q); GET /estadisticas (A) | Consultando · curso sin asignación · sin datos agregados | Curso asignado e ID de simulacro. CA-RR03/04 y CA-AE04/05: presenta agregados y temas/preguntas con error dentro de su asignación. |

## Estudiante o postulante

| Pantalla y rol | Módulo · RF · HU | Función y REST | Carga · error · vacío | Dependencia y aceptación |
| --- | --- | --- | --- | --- |
| Acceso y reanudación de simulacro · P | E · RF04–06 · HU04/05 | POST /iniciar; GET /{id} | Abriendo · inhabilitado/no inscrito/vencido · sin referencia | Referencia y sesión activa. CA-RE01/02, CA-VS03: recupera el intento único y comprueba padrón. |
| Rendición virtual y ficha impresa · P | E · RF04–07 · HU04/05 | GET /{id}; PUT /{id}/respuestas; POST /{id}/finalizar | Guardado local/sincronización/cierre · conflicto o vencimiento · pregunta sin marca | Intento y reloj del servidor. CA-RE02–06: virtual muestra enunciado, impresa usa orden; marcar, sustituir, borrar, reconciliar y finalizar sin revelar claves. |
| Nota individual · P propietario | R · RF07/08 · HU06 | GET /{id} con ID del intento | Calculando/consultando · sesión/recurso no disponible · nota pendiente | Cierre de E. CA-PR05: puntaje y conteos definitivos por curso, incluido puntaje cero. |
| Posición propia · P | Q · RF10 · HU07 | GET /{simulacroId}/propio | Consultando/publicación pendiente · acceso no disponible · sin posición | Simulacro del resultado/historial. CA-RR01/03: muestra posición propia en ámbitos disponibles. |
| Historial y desempeño · P | A · RF09/11 · HU08 | GET /mi-historial | Consultando · error recuperable · sin historial o sin datos por curso | Resultados definitivos. CA-AE01/02/04, CA-VS04: tendencia y barras accesibles, conserva resultados entre ciclos. |
| Recomendación de refuerzo · P | A · RF13 · HU09 | POST /mi-recomendacion | Consultando/generando · error temporal · evidencia insuficiente o sin prioridades | Historial propio. CA-AE03/04: presenta contenido retornado y alternativa local cuando el backend la use. |

## Descubrimiento de recursos

OpenAPI y las rutas permiten crear cursos y simulacros y operar con IDs conocidos. No se identificaron listados generales de cursos, simulacros disponibles, asignaciones, separatas ni cargas previas. GET de simulacro es por ID y su alcance se verifica por ruta; el postulante inicia con la referencia y la API comprueba la elegibilidad. El historial aporta IDs de simulacros rendidos y la creación devuelve referencias para continuar en el mismo flujo. El menú puede admitir referencias conocidas si el usuario aprueba cómo se distribuyen y recuperan. Los nombres o listas ausentes no deben inferirse ni descargarse ampliando permisos. Si son necesarios para el recorrido académico, registrar el impacto y validar el cambio por separado. La interfaz no incluye matrícula, pagos ni transmisión de clases.

## Contratos incorporados al finalizar Fase 2

Usuarios incorpora historial paginado de cargas con alcance por sede y búsqueda de usuarios por q antes de paginar. Banco incorpora GET /cursos, GET /simulacros, GET /cursos/{cursoId}/docentes y GET /separatas. Cursos admite búsqueda por nombre. Simulacros admite filtro por referencia. Las asignaciones se consultan por curso. Separatas admite curso y estado, con consulta global del administrador general y consulta propia del docente. Las vistas usan selectores y listados para recuperar referencias. El identificador y el tipo del archivo identifican separatas históricas porque el modelo no conserva el nombre original.

## Rendición web

El listado del postulante usa GET /api/v1/examenes/simulacros. Véanse los criterios de elegibilidad en la SDD de Rendición. La modalidad impresa mantiene el número y las letras de la versión congelada. La transición a Mi nota conserva la referencia del intento para la Fase 4.
