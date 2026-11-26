# Sprint 2: Implementación y validación de la arquitectura de software

Fuente: enunciado del docente (curso IS-488 Arquitectura de Software).

En este sprint, los estudiantes llevarán a código la arquitectura documentada en el Sprint 1, implementando una primera versión funcional del proyecto.

## Actividades

1. Implementar el estilo arquitectónico.
2. Aplicar el enfoque o patrón arquitectónico (ejemplo: Clean Architecture, MVC).
3. Especificaciones SDD de las funcionalidades implementadas, incluyendo criterios de aceptación y tareas técnicas.
4. Endpoints REST funcionales y documentados con OpenAPI/Swagger.
5. Analizar el comportamiento de la base de datos y la estrategia de caché.
6. Aplicar principios SOLID y patrones de diseño cuando corresponda.
7. Implementar pruebas automatizadas con Jest para validar las funcionalidades y reglas de negocio. Se recomienda integrar estas pruebas en un flujo CI/CD mediante GitHub Actions, para automatizar su ejecución ante cada cambio en el código.
8. Ejecutar pruebas basadas en los escenarios de atributos de calidad definidos en el Sprint 1, utilizando herramientas adecuadas como Postman, k6 (simular progresivamente hasta 2,000 usuarios virtuales concurrentes), Jest, entre otros.

## Entregables

- Código fuente organizado según la arquitectura propuesta.
- Primera versión funcional del proyecto.
- Documentación de API mediante OpenAPI/Swagger.
- Pruebas automatizadas con Jest y reporte de cobertura.
- Evidencias y resultados de validación de los atributos de calidad.

## Criterio fundamental

Se evaluará que la implementación respete las decisiones arquitectónicas documentadas y que los estudiantes puedan demostrar, mediante pruebas, si la solución responde a los atributos de calidad establecidos.

## Notas del proyecto (no forman parte del enunciado)

- Se implementan los 6 módulos del backend completos, no solo los prioritarios.
- La aplicación web y el despliegue en AWS corresponden al Sprint 3 (ver `docs/sprint-3.md`).
- Las pruebas de carga con k6 llegan hasta 2,000 usuarios virtuales, aunque el atributo AC03 define un objetivo de 5,000 conexiones (ver `04-atributos-de-calidad.md`).
- En las pruebas automatizadas y de carga se usa el adaptador simulado de `ServicioIA`, nunca la IA real.
## Auditoría de cierre funcional y validación pendiente

Base revisada: commit `a5cddf0`. El backend tiene seis módulos y 73 tareas funcionales marcadas. La auditoría reutiliza los resultados de los cierres de módulo y distingue las pruebas funcionales del cumplimiento de escenarios de calidad. La revisión fue documental y estática, sin ejecutar carga ni repetir los recorridos por módulo.

### A. Actividades del enunciado

| Actividad original | Estado | Evidencia y brecha |
| --- | --- | --- |
| 1. Implementar el estilo arquitectónico. | Cumplida para el backend | `src/index.ts` compone seis módulos en una API Express. Compose ejecuta los consumidores del mismo código y los servicios de apoyo. ADR-001 y C4 N2–N3. Kubernetes, EC2 y servicios administrados corresponden a otro alcance. |
| 2. Aplicar el enfoque o patrón arquitectónico (ejemplo: Clean Architecture, MVC). | Parcial | Capas, puertos y adaptadores presentes. Las aplicaciones de Banco importan contratos de aplicación compartidos, una excepción literal a la regla de depender solo del Dominio. Varios adaptadores y contratos se publican por `index.ts`, y la composición de Rendición recibe APIs públicas de Banco y Usuarios. Aclarar la excepción de los puertos compartidos y comprobar dependencias estáticamente antes de plantear cambios. |
| 3. Especificaciones SDD de las funcionalidades implementadas, incluyendo criterios de aceptación y tareas técnicas. | Cumplida | Las seis carpetas de `specs/` contienen SDD y tareas. Los 73 ítems funcionales contabilizados son 25+12+10+9+9+8. Se conserva la limitación explícita de HU11 sobre inscritos. |
| 4. Endpoints REST funcionales y documentados con OpenAPI/Swagger. | Parcial | Swagger combina la especificación central y cinco mapas adicionales. Hay pruebas de inventario en Usuarios y Banco, y recorridos HTTP por módulo. Falta contraste global de métodos, estados y esquemas, incluyendo respuestas condicionales y errores. El servidor local usa HTTP. El cifrado en tránsito se evalúa por separado según AC04. |
| 5. Analizar el comportamiento de la base de datos y la estrategia de caché. | Parcial | Migraciones SQL, compatibilidad, transacciones y recorridos reales. Falta caracterizar consultas, bloqueos, pool, memoria Redis y recuperación PostgreSQL/Redis en escenarios representativos. La evidencia justifica mantener el diseño actual hasta medirlo. |
| 6. Aplicar principios SOLID y patrones de diseño cuando corresponda. | Cumplida en el alcance revisado | Repository, Adapter, inyección por constructor y segregación de interfaces observables en casos de uso y adaptadores. El reemplazo de IA por un adaptador simulado demuestra sustitución en los recorridos. Outbox y mensajería asíncrona son mecanismos implementados. Observer figura como alternativa en el diseño, sin acreditación como patrón independiente del código. |
| 7. Implementar pruebas automatizadas con Jest para validar las funcionalidades y reglas de negocio. Se recomienda integrar estas pruebas en un flujo CI/CD mediante GitHub Actions, para automatizar su ejecución ante cada cambio en el código. | Cumplida | Jest, Supertest y CI con Node.js 20. Cobertura y regresión local de 428 pruebas y 87 suites. El workflow valida compilación y Jest con cobertura. Los recorridos de infraestructura se ejecutaron aparte. |
| 8. Ejecutar pruebas basadas en los escenarios de atributos de calidad definidos en el Sprint 1, utilizando herramientas adecuadas como Postman, k6 (simular progresivamente hasta 2,000 usuarios virtuales concurrentes), Jest, entre otros. | Parcial | Existe evidencia puntual para AC01, autorización, ampliación de sedes y recuperación de ciertos fallos. Falta la campaña integral y k6. Postman es una herramienta posible según el enunciado. No hay colección versionada y los recorridos actuales utilizan Swagger, Supertest y scripts. |

### B. Trazabilidad funcional y evidencia reutilizable

Las rutas se indican por familia. El detalle de métodos y contratos está en los archivos OpenAPI y en las SDD enlazadas.

| Requisitos | Implementación y rutas | Evidencia y brecha |
| --- | --- | --- |
| RF01–02, RF19–26 | Usuarios. `/api/usuarios`, login, estudiantes, docentes, sedes, cambios de cuenta, activación, administradores y cargas masivas. JWT, hash y alcance por sede. | [SDD Usuarios](../specs/usuarios/spec.md), `verificar-usuarios-compose.cjs`, CI 45526873308. RF25 se satisface mediante seed explícito e idempotente. Compose migra el esquema al arrancar y el operador ejecuta el seed con las variables sintéticas. Confirmar si la rúbrica exige automatizar ese paso. |
| RF03, RF15–18 | Banco. `/api/banco-preguntas`, preguntas por curso, temas, separatas, propuestas y revisión. Worker y puertos ServicioIA/AlmacenArchivos. | [SDD Banco](../specs/banco-preguntas/spec.md), contrato Swagger, `verificar-banco-compose.cjs`, CI 45532258705. Extracción multimodal y propuestas probadas con adaptador o transporte simulado. |
| RF04–06 | Rendición. `/api/v1/examenes`, iniciar, consultar, registrar y finalizar. Simulacro único congelado, reloj del servidor, revisión de marcas y reintento. | [SDD Rendición](../specs/rendicion-examen/spec.md), `verificar-rendicion-compose.cjs`, CI 45536622028. Falta demostrar la parte en dispositivo, incluida la sincronización automática del cliente web, en Sprint 3. |
| RF07–09 | Resultados. `GET /api/v1/resultados/{id}` responde 202 mientras procesa y 200 al disponer de nota. Analítica consume historial definitivo. | [SDD Resultados](../specs/resultados/spec.md), `verificar-resultados-compose.cjs`, CI 45541070460. 1124 ms del cierre a la primera consulta exitosa en un recorrido con sondeo. Es una observación individual. Falta evidencia distribuida bajo concurrencia y, para la experiencia visual, frontend. |
| RF10, RF14 y HU11 | Ranking y Reportes. `/api/v1/rankings`, rankings general, carrera y sede, reportes y Excel. | [SDD Ranking](../specs/ranking-reportes/spec.md), `verificar-ranking-compose.cjs`, CI 45663589106. Participación y calificación comprobadas. La inscripción por simulacro permanece no disponible por falta de registro de origen. El dato requiere decisión propia sin inferirlo de intentos ni de matrículas. |
| RF09, RF11–13 | Analítica. `GET /api/v1/analitica/mi-historial`, `GET /api/v1/analitica/estadisticas` y `POST /api/v1/analitica/mi-recomendacion`. | [SDD Analítica](../specs/analitica/spec.md), `verificar-analitica-compose.cjs`. RF12 preserva versión y tema históricos, con categoría no clasificada. RF13 verifica renovación y deduplicación con proveedor simulado y plantillas. RF11 tiene datos para gráficos, pendientes en Sprint 3. |

La referencia más reciente es [CI de a5cddf0](https://github.com/noelvaldez27-debug/Academia-arquitSoft-02-noelvaldez/actions/runs/45702298593), que aprobó instalación, compilación y Jest con cobertura. Los procedimientos y condiciones de Compose están en [Despliegue local](despliegue.md). Se reutilizan las evidencias previas por módulo en las revisiones de solo documentación o de alcance acotado.

### C. Correspondencia de arquitectura y API

- **ADR-001–002 y C4.** Proceso HTTP único y workers separados por responsabilidad operativa, compartiendo la base de código. Los contratos públicos de cierre, claves congeladas, resultados definitivos y asignaciones conectan módulos. Rendición reutiliza el servicio público de congelamiento de Banco dentro de una transacción coordinada. En las rutas revisadas no se observó acceso directo de Analítica o Ranking a tablas de otros módulos. El C4 describe trabajadores y contratos a nivel lógico. Para la evidencia final conviene indexar los procesos reales de Compose y puertas de integración, conservando las vistas objetivo para Sprint 3.
- **ADR-003 y RC05–07.** Redis es almacenamiento temporal autoritativo para respuestas activas, con AOF y operaciones Lua atómicas. PostgreSQL conserva intentos, versión congelada, calificación, ranking y recomendación. El cierre sella las marcas, consolida y registra el evento definitivo. Rendición retira los datos temporales después del despacho. La versión congelada se persiste en PostgreSQL. Conviene verificar con el usuario si la referencia a fichas activas en RC05 se satisface con el estado de sesión en Redis o exige una definición adicional.
- **ADR-004, ADR-009 y ADR-016.** RabbitMQ procesa cierres, proyección de rankings, separatas y carga masiva. Rendición y Banco tienen bandejas de salida persistentes. Ranking reconcilia estado y proyección; Resultados deduplica por examen y usa confirmaciones y reintentos con cola de fallos. Hay evidencia de caída y recuperación del broker. El tiempo de recuperación y el vaciado de backlog bajo saturación quedan pendientes.
- **ADR-007–008.** JWT, hash y autorización por rol/sede comprobados en recorridos. El middleware verifica actividad de cuenta contra PostgreSQL por solicitud. Resultados distingue 202 pendiente con `Retry-After`, 404 ajeno o inexistente y 503 temporal. Las familias presentan convenciones distintas de estado y envoltorio de error. La brecha es comprobar el contrato real de cada familia, no imponer uniformidad sin necesidad. Por ejemplo, Banco documenta estados genéricos reutilizados y las respuestas de temas carecen de esquema concreto en varias operaciones. Verificar también multipart, Excel, esquemas alternativos de recomendaciones y ejemplos de errores.
- **ADR-010–015.** IA y almacenamiento están tras adaptadores; los recorridos usan datos sintéticos, simulación y disco local. Las migraciones 001–016 se aplican por orden, con transacciones y control de ejecución. Las pruebas 015–016 conservaron una versión anterior sin tema en esquema aislado. Los pasos cloud, cliente web y cifrado del entorno final corresponden a su fase. La URL local usa HTTP y `/health` solo responde por el proceso HTTP.
- **Persistencia y consistencia.** PostgreSQL aplica unicidad de intento por postulante y simulacro, unicidad de calificación por examen, referencias e índices locales y bloqueos de cierre/recomendación. Las instantáneas conservan sede, carrera, condición y tema cuando existe evidencia. Los vínculos entre algunos datos de módulos se validan por contratos y no todos tienen FK entre módulos. Reutilizar las pruebas de idempotencia y compatibilidad. Medir consultas de autorización, consolidación, proyecciones, paginación y estadísticas amplias antes de decidir índices o caché. Redis no se usa para cachear ranking, Analítica ni autenticación. El ranking es una proyección PostgreSQL y la recomendación se reutiliza por huella y versión.

### D. Matriz de atributos de calidad

Los umbrales textuales provienen de [Atributos de calidad](01-analisis-de-sistema/04-atributos-de-calidad.md). Las métricas adicionales son propuestas de medición, sujetas a aprobación cuando impliquen un criterio cuantitativo.

| Atributo | Estímulo y entorno | Respuesta y umbral originales | Evidencia, estado y prueba pendiente |
| --- | --- | --- | --- |
| AC01 Rendimiento | Postulante envía examen durante un simulacro. | Nota propia en «pocos segundos» y ranking general puede tardar «algunos minutos». Sin cifra exacta. | Parcial. 1124 ms con sondeo en un recorrido aislado. Medir p50/p95/p99 de cierre a nota disponible y de cierre general a ranking, incluyendo fallos y backlog. Acordar límites y percentil. |
| AC02 Disponibilidad | Horas críticas de simulacro o examen oficial en tres sedes. | Disponible «casi al 100 %». Sin ventana ni porcentaje preciso. | Parcial. Healthchecks y recuperación del broker; /health solo confirma proceso. Medir proporción de operaciones válidas, tiempo de indisponibilidad y recuperación por sede durante ventana aprobada. |
| AC03 Escalabilidad | Simulacro masivo y aumento de sedes/matrícula. | Objetivo 5 000 conexiones simultáneas. Sprint 2 mide progresivamente hasta 2 000 VU con k6. | Pendiente para concurrencia. Documentar curva hasta el máximo seguro y diferencia entre VU, conexiones y solicitudes por unidad de tiempo. La ejecución de 2 000 VU no acredita 5 000 conexiones. |
| AC04 Seguridad | Acceso a información personal y académica por roles y sedes. | Protección mediante cifrado y autorización. Sin umbral numérico. | Parcial. Hash de contraseñas, JWT y pruebas de propietario/rol/sede. Verificar matriz negativa transversal y delimitar evidencia de cifrado en tránsito y en reposo. Hash no acredita cifrado de datos. |
| AC05 Mantenibilidad | Incorporación de sede o módulo durante evolución. | Incorporar sin afectar lo existente. Sin métrica numérica. | Parcial. Alta de sede basada en tablas, contratos públicos y regresión. Documentar alcance de cambios y ejecutar un caso de nueva sede con recorridos seleccionados y revisión de dependencias. |
| AC06 Usabilidad | Personas con poca experiencia consultan resultados, ranking, gráficos o recomendaciones. | Interfaz sencilla y comprensible. Sin escala de aceptación. | No verificable con la API sola. En Sprint 3 proponer tasa de tareas completadas, errores y tiempo, con guion y criterios acordados. |
| AC07 Resiliencia ante conectividad intermitente | Pérdida de red a mitad del examen y recuperación. | Conservar respuestas en el dispositivo y sincronizar automáticamente sin pérdida. | Parcial. API soporta revisiones, reintentos y vencimiento. Demostrar conservación y envío automático en cliente del Sprint 3. En backend medir marcas confirmadas, duplicadas y perdidas ante reintentos permitidos. |
| AC08 Eficiencia de costos | Carga habitual y pico de simulacro. | Infraestructura mínima en días regulares y escalar solo en picos. Sin presupuesto ni política cuantitativa. | Parcial. Compose y arquitectura de servicios reutilizables; Kubernetes es objetivo, EC2 corresponde a Sprint 3. Medir consumo base/pico y tiempo de recuperación local; dejar costo y escalado real para su entorno. |

### E–G. Brechas, evidencias reutilizables y pendientes

Jest incluye casos unitarios, de rutas y composición con dobles. Compose aporta la integración de PostgreSQL, Redis y RabbitMQ, compatibilidad incremental, concurrencia de cierre y recomendación, duplicados, recuperación de RabbitMQ, histórico y exportación. Verificar la cobertura en el reporte local, distinguida del éxito de CI. La extracción del resumen local coincide con los valores globales registrados (89,69 % líneas y 83,03 % ramas). En orden de módulos 1–6, líneas/ramas: Usuarios 91,37/84,13, Banco 87,38/79,27, Rendición 85,39/84,38, Resultados 79,61/93,33, Ranking 91,86/78,74 y Analítica 98,35/85,71. Son cifras descriptivas del reporte local, no una medida de atributos de calidad ni un umbral general exigido.

Quedan pendientes un inventario contractual consolidado, observación de PostgreSQL y Redis bajo tráfico y fallos controlados, caracterización de concurrencia y un acta que distinga lo demostrable en backend de los escenarios pendientes del Sprint 3. No se justifica repetir cada recorrido histórico completo. Repetir el flujo transversal o el recorrido afectado si la versión o el escenario ya no coincide.

### H. Plan de carga para aprobación

1. Usar k6 contra un entorno Compose propio y aislado, con volúmenes y credenciales sintéticos, URL privada, datos de tres sedes y proveedor simulado. Registrar SHA, versiones, configuración, CPU/RAM, disco, sistema, topología, tamaño del conjunto, distribución de sedes, semillas, recursos del generador y tiempos de espera. Mantener el reloj y el plazo de examen coherentes con cada escenario.
2. Propuesta de escalones VU, no umbrales de calidad: humo a 1–10 y mesetas a 50, 100, 250, 500, 1 000, 1 500 y 2 000, con rampa y periodo estable acordados. Cerrar con descenso y recuperación de colas. Mantener separados el generador y la API si la saturación local impide atribuir el cuello de botella. Documentar el máximo seguro alcanzado.
3. Modelar inicio de sesión e intento, consulta, edición de marcas con revisiones, cierre y sondeo de nota. Medir un pico coordinado de cierres y una mezcla proporcional de ranking e historial. Añadir un escenario separado con fallos controlados para distinguir resiliencia de saturación. Limitar recomendaciones a casos representativos con IA simulada y reservar una fase separada para exportaciones o cargas masivas administrativas.
4. Capturar latencias p50/p95/p99 y duración de cierre a nota/ranking, solicitudes/segundo, resultados/segundo, errores inesperados (separados de 202 o conflictos esperados), conexiones, procesos y recursos de API, worker y generador. Observar pool y bloqueos PostgreSQL, memoria y latencia Redis, backlog/confirmaciones RabbitMQ. Reconciliar intentos cerrados y calificaciones sin duplicación, historial e invariantes por sede.
5. Detener el escalado si falla una verificación de integridad o aislamiento, si el generador deja de sostener el escenario, si aparecen reinicios, agotamiento de recursos, indisponibilidad sostenida o backlog que crece sin recuperarse. Acordar antes de ejecutar las ventanas y valores cuantitativos para errores, memoria, latencia y recuperación. Conservar el diagnóstico aunque un escalón quede incompleto. Aceptar según los escenarios AC01–08 aplicables y los criterios aprobados; sin extrapolar a producción ni a 5 000 conexiones.

### I–J. Trabajo restante y decisiones

| Tarea | Objetivo y prioridad | Dependencia | Aceptación y evidencia |
| --- | --- | --- | --- |
| V1. Acordar criterios medibles | Alta. Traducir términos de AC01–02 y AC08, delimitar AC04 y fases de AC06–07. Decidir interpretación RC05 y arranque RF25. | Aprobación del usuario/docente según rúbrica. | Matriz aprobada con métricas, ventanas, límites y alcance. Mantener los textos originales. |
| V2. Verificar contratos y permisos | Alta. Contrastar rutas, Swagger, roles, sedes, esquemas y códigos reales. | V1 para alcance de cifrado. | Inventario de rutas y prueba dirigida de divergencias confirmadas, incluyendo una sede nueva y cuentas inactivas. Si aparece una corrección, separar su aprobación e implementación. |
| V3. Caracterizar PostgreSQL, Redis y recuperación | Alta. Medir acceso, bloqueos, estado temporal, reinicios y consistencia. | Entorno aislado y ventanas V1. | Serie de métricas y evidencia reproducible de respuestas consolidadas, recuperación y ausencia de duplicados. Declarar fallos y límites alcanzados. |
| V4. Preparar y ejecutar carga escalonada | Alta. Demostrar AC01–03 y recolectar evidencia de AC08. | V1, entorno V3 disponible, aprobación separada de ejecución. | Guiones y configuración versionables, tablas de escalones alcanzados, latencia, errores y recursos, reconciliación y diagnóstico de interrupciones. |
| V5. Resolver alcance de HU11 | Media. Confirmar si se acepta inscripción no disponible o se exige fuente autorizada. | Decisión de negocio y fuente. | Decisión trazable; si se exige implementación, criterio y prueba con inscripciones verificables. |
| V6. Consolidar acta de Sprint 2 | Alta para cierre. Registrar resultados y brechas aceptadas por fase. | V1–V5. | Matriz final con resultados por SHA, alcance backend y pendientes explícitos del Sprint 3. |

Para autorizar la siguiente etapa, confirmar V1, el alcance de V2–V4 y el tratamiento de HU11. La propuesta preserva las reglas aprobadas del backend y mantiene las correcciones y ejecuciones pendientes de autorización.

### Criterios técnicos aprobados para la siguiente etapa

AC01 se operacionaliza con p95 de hasta 2 s para consultas REST habituales, hasta 1 s para registrar respuestas, hasta 5 s desde el cierre hasta que la nota definitiva esté disponible y hasta 3 s para consultas de ranking. Bajo carga, los errores técnicos deben ser inferiores al 1 %. Los estados esperados, como 202 mientras se procesa un resultado, se miden aparte. Estos valores complementan el texto original. El 99,9 % de disponibilidad es un objetivo propuesto. Una prueba local controlada mide recuperación, éxito de solicitudes y consistencia dentro de su ventana, sin acreditar disponibilidad mensual o anual.

El impacto de las nuevas reglas y sus criterios se registra en la [SDD de validación](../specs/validacion-sprint-2/spec.md). Los escenarios de cifrado del entorno desplegado, cliente offline y usabilidad de la aplicación se conservan en la matriz con sus dependencias de Sprint 3.

### Preparación del guion k6

El guion `pruebas/carga/simulacro.k6.js` exige activación explícita, una API en loopback y un archivo JSON local con una cuenta sintética distinta por VU. Impide redirecciones. Antes de una ejecución autorizada, crear cuentas y simulacros desechables mediante API o la carga masiva del entorno aislado. Cada escalón usa un simulacro nuevo con al menos una pregunta habilitada y una duración que cubra la fase y los reintentos. Conservar las credenciales sintéticas fuera de Git. Configurar ambos proveedores simulados en Compose y no habilitar Gemini.

Plan de ejecución posterior: humo, luego 50, 100, 250, 500, 1 000, 1 500 y 2 000 VU como máximo. Un lanzamiento independiente por escalón permite reconciliar intentos y notas antes de seguir. Cada VU autentica, inicia, consulta, registra una marca, espera la ventana configurada, cierra, sondea la nota y consulta ranking propio. La duración medida incluye el cierre y el intervalo de sondeo. Las comprobaciones funcionales se reportan aparte de la tasa de errores técnicos. El guion mide ranking propio, mientras que la disponibilidad del ranking general definitivo debe medirse con un observador del cierre general y su proyección.

Parámetros previstos: `API_LOCAL`, `SIMULACRO_ID`, `USUARIOS_SINTETICOS`, `MARCA_SEGUNDOS` y `VUS`. `AUTORIZAR_CARGA=si` se utiliza exclusivamente tras aprobación. La invocación posterior será `k6 run --out json=RUTA_LOCAL_DE_EVIDENCIAS pruebas/carga/simulacro.k6.js`. Guardar salida original, resumen, recursos Docker y generador, métricas de PostgreSQL, Redis y RabbitMQ, SHA y características del equipo. Detener antes del siguiente escalón ante saturación persistente o fallo de integridad. La estabilización sostenida y el observador de ranking definitivo deben calibrarse durante el humo autorizado. El valor de 2 000 VU es el máximo previsto y no un resultado obtenido.

La autorización posterior confirmó la gestión mínima de ciclos, el padrón previo al primer intento y la excepción de importación para nuevo ciclo. El detalle de decisiones y criterios está en la [SDD de validación](../specs/validacion-sprint-2/spec.md).

### Evidencia incremental de gestión de cuentas

El seguimiento de CA-VS01–02 está en la [SDD de validación](../specs/validacion-sprint-2/spec.md). Las rutas de entrega y archivado incorporadas tienen contrato OpenAPI y recorrido local reproducible. La evidencia de este recorrido no acredita todavía la recuperación en nuevos ciclos ni el padrón de HU11.

### HU11 y validación de cuentas

Las tareas 4 y 5 implementaron y validaron la recuperación para ciclos y el padrón histórico de simulacros. Las migraciones 020–021 respetan datos existentes. Los simulacros nuevos requieren habilitación explícita y el reporte conserva como desconocidos los indicadores de padrón que no pueden verificarse en simulacros anteriores. Ver el recorrido Compose y los contratos en la [SDD de validación](../specs/validacion-sprint-2/spec.md).

### Resultados controlados de la etapa de validación

Entorno: proyecto Docker Compose aislado con datos sintéticos, 8 CPU y 3,74 GiB disponibles para Docker Engine 29.5.3. Se conservaron volúmenes. Las cifras observadas corresponden a muestras funcionales pequeñas, sin tráfico masivo.

- **PostgreSQL.** Se analizaron lecturas con EXPLAIN (ANALYZE, BUFFERS, TIMING OFF). La consulta de cuenta usó usuarios_pkey (0,454 ms). La comprobación de intentos activos usó examenes_rendicion_vencimiento (0,049 ms y cero coincidencias). La lectura del padrón usó la clave primaria mediante Bitmap Index Scan (0,094 ms). Estos planes corresponden al conjunto pequeño de prueba. El acceso por postulante en actividad y los filtros de padrón merecen observación bajo carga antes de decidir índices.
- **Persistencia PostgreSQL.** Tras reiniciar únicamente su contenedor, una consulta volvió a responder en 1 908 ms desde el inicio de la operación de reinicio. Coincidieron las cantidades de cuentas, intentos, notas y miembros de padrón antes y después (15, 4, 4 y 2). Las pruebas de ciclo, padrón y reactivación complementan la comprobación de integridad y preservación histórica.
- **Redis.** Es almacenamiento temporal de marcas vigentes, con scripts atómicos, AOF activo y eliminación tras consolidación y despacho. No se añade caché de consultas. En un intento sintético la caída devolvió 503. La consulta volvió a responder 16 501 ms después del primer 503 observado y devolvió la marca exacta confirmada anteriormente. El intervalo incluye el tiempo transcurrido entre la detección y el reinicio manual. AOF e inicio de Redis reportaron estado correcto. El intervalo desde la solicitud de finalizar hasta confirmar el reporte fue de 1 956 ms en ese recorrido, incluida la consulta repetida del cierre general y del reporte.
- **Consumo puntual sin carga.** El backend usó 41,99 MiB, PostgreSQL 48,73 MiB, Redis 5,801 MiB y RabbitMQ 127,6 MiB. La política de expiración de Redis depende del cierre y despacho del intento, con AOF para reinicio. Falta observar crecimiento y saturación durante el escenario k6.
- **Reproducción.** En el proyecto aislado, ejecutar `pruebas/verificar-credenciales-compose.cjs` con VERIFICAR_ARCHIVO, VERIFICAR_PADRON y VERIFICAR_REDIS en si. Tras LISTO_REDIS detener solo el Redis de la prueba y reiniciarlo tras REDIS_INTERRUMPIDO. Registrar el intervalo observado, estado AOF y las marcas recuperadas. La recuperación del broker permanece respaldada por recorridos anteriores.

| Atributo | Resultado actualizado y alcance |
| --- | --- |
| AC01 | Parcial. Consulta, cierre y proyección funcionales en Compose. Los p95 aprobados requieren la campaña escalonada. |
| AC02 | Parcial. Recuperación de dependencias observada durante interrupciones controladas. El objetivo propuesto de 99,9 % requiere una ventana representativa de operación. |
| AC03 | Pendiente de la campaña hasta 2 000 VU. La integración y la medición puntual tienen un alcance distinto. |
| AC04 | Parcial. Autorización y límites por sede, hash, JWT, expiración, entrega de un uso y revocación verificadas. El cifrado del entorno desplegado sigue pendiente de su fase. |
| AC05 | Evidencia favorable del backend. Regresión, contratos públicos, prueba de capas y alta de sede probada en la evidencia anterior. Ampliar con cambios futuros si aplica. |
| AC06 | Pendiente de interfaz web y evaluación de tareas con usuarios. |
| AC07 | Parcial. Recuperación de marcas confirmadas en el backend, rechazo temporal y conservación vía AOF. Guardado y sincronización automática en dispositivo dependen del Sprint 3. |
| AC08 | Parcial. Consumo base local registrado. Falta el perfil de pico y la evidencia de costo y escalado en el entorno previsto. |

En la reevaluación de las ocho actividades, 1, 2, 3, 4, 5, 6 y 7 cuentan con evidencia para el alcance local del backend. La actividad 8 permanece parcial hasta obtener evidencias de carga y documentar los escenarios que se validarán en Sprint 3. El Sprint 2 sigue abierto.

### Guion final para campaña autorizada

El guion actualizado requiere un ciclo sintético independiente por escalón, un simulacro nuevo y un postulante distinto por VU. Preparar miembros mediante carga explícita de ciclo, consumir el Excel provisional y cambiar contraseñas antes de la medición. Guardar la lista JSON de correos y contraseñas sintéticas fuera de Git y proporcionar el administrador sintético mediante variables de entorno. Los nombres de configuración añadidos son CICLO_ID, ADMIN_SINTETICO_CORREO y ADMIN_SINTETICO_PASSWORD. El correo administrativo de prueba debe usar un dominio .invalid. La API debe escuchar en loopback y usar ambos proveedores simulados.

Antes de medir, setup habilita el simulacro y exige un padrón con exactamente VUS postulantes y cero intentos. Cada VU ejecuta el flujo de examen. Después, teardown solicita el cierre general y verifica el reporte definitivo con todos los inscritos, participantes, finalizados y calificados esperados. Registra por separado la latencia hasta el ranking definitivo. Los p95 aprobados permanecen en el guion. Mantener la captura de recursos fuera de k6, conservar salidas por escalón y detener el aumento de concurrencia ante errores de integridad, saturación o backlog sin recuperación.

Tras autorización, comenzar con 1–10 VU para calibrar la ventana y continuar con 50, 100, 250, 500, 1 000, 1 500 y 2 000 según capacidad del entorno. Dar por terminado cada escalón solo tras reconciliar el reporte y estabilizar los recursos. Ejecutar desde la máquina de pruebas con la CLI de k6 y el interruptor AUTORIZAR_CARGA=si. Este cambio se verificó por sintaxis de JavaScript. El humo k6 y la campaña siguen pendientes de autorización.
