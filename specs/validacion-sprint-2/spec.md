# SDD · Validación del Sprint 2 y ajustes académicos

## Impacto y criterios propuestos

- **Usuarios (RF01–02, RF20–24, RC09, RC15–16).** Reusar activo/inactivo como puerta de acceso y listar activos por defecto en la gestión habitual de postulantes. Registrar actor, fecha, alcance y cambio, sin contraseñas. Conservar ID y DNI, permitir actualización de perfil en el ámbito autorizado y mantener datos y credenciales anteriores fuera de la respuesta. La invalidación actual consulta activo por petición. Un JWT anterior podría volver a aceptarse tras reactivar si no expiró. Proponer versión de sesión persistida y comprobar que el JWT anterior sigue rechazado tras recuperar la cuenta. El restablecimiento debe emitir una credencial provisional nueva mediante un canal autorizado. Un administrador de sede opera dentro de su sede; el traslado entre sedes corresponde al general.
- **Conflicto RF21 y CA-U13.** El original omite DNI existentes, también inactivos según la SDD. Propuesta: conservar omisión por defecto y ofrecer recuperación explícita en la importación del nuevo ciclo mediante una opción aprobada. Omitir duplicados activos incluso en ese modo. Reportar recuperados y filas fuera de alcance sin exponer datos de otra sede. Se requiere confirmar la excepción a RF21 y cómo se entregan las credenciales provisionales en lote.
- **Ciclos (RF09, RF24).** Las migraciones actuales no tienen ciclo ni membresía. Se propone un catálogo mínimo con ID y estado, relación de postulantes y simulacros, más registro de la operación de cierre. Sin reconstrucción de ciclos anteriores. En un cierre válido, bloquear la incorporación de nuevos intentos al ciclo, comprobar cierres en Rendición y archivar solo postulantes autorizados del ciclo sin interrumpir intentos activos. Resultados procesa pendientes sin depender de la sesión. Definir si se permiten ciclos simultáneos y la autoridad que cierra cada ciclo. Reusar el bloqueo y el cierre de Rendición, cuya confirmación general actualmente espera calificaciones.
- **HU11 (RF10, RF14, RC10).** Hoy Banco configura y Rendición congela al iniciar, sin publicación previa ni padrón. Proponer habilitación explícita previa al primer intento de nuevos simulacros. Congelar en una transacción la población del ciclo y sus dimensiones de sede y carrera. Diferenciar cabecera con población vacía de ausencia de instantánea en simulacros legados. La admisión comprueba pertenencia y cuenta activa. Los reportes derivan inscritos, participantes, no participantes, activos, finalizados y calificados; porcentaje = participantes / inscritos × 100 cuando inscritos > 0. Para cero inscritos se propone porcentaje no aplicable (null), separado del cero por ausencia de participación con denominador positivo. Corroborar el momento de habilitación y el ámbito de la población.
- **Condición académica.** RF01, RF09, RF10, RF21 y RF22 no exigen MATRICULADO/LIBRE. Sí fue una decisión anterior de CA-RR01/04, reemplazada por instrucción explícita. Conservar columnas, instantáneas y filtros para históricos. Dejar de requerir o asignar condición en altas nuevas y retirar su edición habitual. Aceptar archivos antiguos con columna histórica sin convertirla en requisito. Ajustar REST, OpenAPI y exportaciones sin reclasificar datos previos. Analítica ya usa resultados definitivos y sede histórica; no requiere una fórmula nueva.
- **Migraciones propuestas.** Solo incrementales. Separar versión de sesión y auditoría administrativa, catálogo/membresías y padrón congelado del simulacro. Mantener el índice único de DNI y verificar los límites entre propietarios mediante puertos.

## Criterios de aceptación

- CA-VS01. Alta, omisión de activo, recuperación autorizada y operaciones fuera de sede se verifican en API y Excel. El mismo DNI conserva ID e historial. Un JWT previo al archivo falla incluso después de reactivar. Dos operaciones concurrentes mantienen una cuenta y un cambio auditable.
- CA-VS02. Archivar uno o un ciclo se limita a postulantes y sede autorizados. Con intento activo se rechaza o difiere sin perder marcas. Reintentar el cierre no modifica intentos ni calificaciones. Las calificaciones pendientes siguen procesándose.
- CA-VS03. Una habilitación congelada resiste cambios posteriores de cuentas, sede y carrera. Un intento nuevo pertenece al padrón. La consulta por sede/carrera compara cohortes equivalentes. Padrón vacío, padrón desconocido y tasa cero se prueban por separado. La edición concurrente no altera el padrón confirmado.
- CA-VS04. Usuarios, Rendición, Ranking y Analítica conservan compatibilidad histórica tras migraciones. Excel y OpenAPI reflejan las decisiones aprobadas. El historial conserva notas y versiones.
- CA-VS05. La evidencia transversal identifica dependencias indebidas, estados HTTP y respuestas divergentes, persistencia y recuperación local, y registra AC01–AC08 por alcance.

## Decisiones aprobadas para implementación

- Excel conserva la omisión por defecto para todo DNI existente. El modo explícito de nuevo ciclo vincula altas y recupera solo postulantes archivados autorizados. Reporta los activos omitidos. RF21 y CA-U13 conservan trazabilidad del comportamiento original.
- El ciclo registra código o nombre, fechas y estado. Usuarios conserva sus membresías históricas y permite una activa por postulante. El administrador general cierra el ciclo. El cierre comprueba simulacros finalizados, ausencia de intentos afectados y continuidad del procesamiento de notas. El archivado por sede queda limitado a su ámbito.
- El padrón se congela al habilitar un nuevo simulacro antes del primer intento, con sede y carrera históricas. La entrada requiere pertenencia al padrón y cuenta activa. Padrón vacío admite cero inscritos con tasa null. Sin padrón verificable, inscritos y los indicadores dependientes quedan no disponibles.
- La condición se conserva para consultas históricas y deja de ser obligatoria en altas nuevas.
- Para altas y recuperaciones que emiten credenciales a postulantes, la nueva decisión reemplaza contraseña DNI y cambio opcional de RF02, RF26 y RC09. Se exige contraseña aleatoria individual, vigencia y cambio inicial. La entrega por lote se limita al administrador responsable, mediante Excel temporal de un solo uso. La contraseña en claro se limita a ese canal autorizado. El almacenamiento temporal para entrega debe estar cifrado, separado del hash, y consumirse atómicamente. Conservar la política existente de docentes y administradores.

## Evidencia parcial de CA-VS01

La migración 017 añade la versión de sesión con valor inicial compatible y la actualiza atómicamente al cambiar el estado o el hash de contraseña. Un JWT sin versión representa la versión inicial. Se comprobó en PostgreSQL con datos sintéticos y rollback, y en Jest se verificó que un token anterior siga rechazado después de reactivar. El alta acepta condición ausente y conserva valores explícitos admitidos por el contrato anterior. Esta evidencia no cubre aún la emisión provisional ni la recuperación de ciclo.

### Evidencia incremental y requisitos aún abiertos

El versionado de JWT de la migración 017 se reutiliza. Las migraciones 018 y 019 introducen credenciales y auditoría. La entrega se realiza con una referencia de una sola recuperación y generación XLSX en memoria. El archivado individual y por lote comprueba alcance e intentos no cerrados. Altas por API y Excel aceptan la ausencia de condición y conservan los datos históricos.

### Ampliación aprobada posterior: importación automática obligatoria por ciclo

La importación nueva siempre selecciona un ciclo abierto autorizado. Clasifica cada fila como creada, recuperada, vinculada a activo sin membresía, ya vinculada o rechazada; advertencias por discrepancia no cambian identidad y bloquean toda recuperación/vinculación. Activos en otro ciclo abierto son rechazados. Cuentas inactivas elegibles por archivado académico solo se recuperan con identidad y sede coincidentes y credencial provisional nueva. Otras inactivas no se reactivan. Alta/recuperación/vínculo y membresía se coordinan transaccionalmente y el ciclo se vuelve a comprobar al procesar cada fila bajo bloqueo compatible con cierre. Cargas previas con ciclo nulo siguen su camino original. El registro individual también requiere un ciclo abierto. Esta regla y el vínculo de activos sin ciclo amplían los criterios anteriores y preservan su historial.

La recuperación por DNI, la modalidad Excel de nuevo ciclo y el padrón de HU11 permanecen abiertas. Mientras se implementa la recuperación de ciclo, la ruta histórica de reactivación aún conserva su semántica de RF24 y no emite una nueva credencial.

Evidencia del avance de tarea 4: Jest 432 pruebas en 87 suites. Cobertura global 87,34 % líneas y 79,74 % ramas, y Usuarios 85,46 % y 77,55 %. Docker Compose ejecutó el recorrido de credenciales y archivado con PostgreSQL, Redis y RabbitMQ. Se comprobó alta habitual sin condición, alta Excel, consumo concurrente de la entrega, vigencia, alcance, rotación de sesión, rechazo de archivado durante un intento activo, archivado idempotente y consulta diferenciada de archivados.

### Tarea 4 completada

La migración 020 crea ciclos y membresías con índice único para impedir membresías activas simultáneas. Los administradores consultan ciclos con GET /api/usuarios/ciclos y el administrador general los crea con POST. El alta por DNI acepta cicloId en JSON y la carga Excel lo acepta como parámetro explícito. El modo normal mantiene la omisión de DNI existentes. La carga de ciclo informa recuperadas por separado, además de los activos omitidos. La recuperación conserva el identificador, mantiene el historial, audita y entrega una nueva credencial. El archivado termina la membresía activa y conserva su fila.

El recorrido Compose con datos sintéticos verificó recuperación individual concurrente, recuperación Excel, actualización de perfil, bloqueo de JWT anterior y de reactivación directa, y credenciales nuevas. La regresión de esta revisión registró 434 pruebas en 87 suites. Pasaron además 2 pruebas dirigidas de sede y cierre de ciclo durante una carga.

### Tarea 5 completada

La migración 021 conserva las configuraciones anteriores como legadas e identifica las nuevas que exigen padrón. El administrador general usa POST /api/v1/examenes/simulacros/{id}/habilitar con cicloId. El padrón se congela bajo una transacción coordinada con el inicio y el cierre general del simulacro. Se conserva la sede y carrera para la admisión y para HU11. Las cuentas activas con membresía vigente forman el padrón. Las restricciones de sesión siguen aplicándose al ingresar.

POST /api/usuarios/ciclos/{id}/cierre exige que todo simulacro habilitado del ciclo tenga cierre general confirmado. Verifica también otros intentos activos de los postulantes afectados. Archiva las cuentas, termina membresías y registra responsable y fecha. Los vínculos y datos académicos permanecen disponibles.

GET /api/v1/rankings/{simulacroId}/reportes/participacion incorpora inscritos, noParticipantes y porcentajeParticipacion, tanto en JSON como en Excel. Los filtros de sede, carrera y condición usan valores congelados cuando existen. Las fechas de intento delimitan los participantes observados; el denominador corresponde a la cohorte habilitada del ámbito. Padrón vacío conserva el cero y devuelve porcentaje null. Padrón histórico desconocido conserva inscritos, noParticipantes y porcentaje en null. El reporte usa la proyección existente para intentos y notas, que se actualiza asíncronamente.

TypeScript y Jest aprobaron 439 pruebas en 89 suites. Compose verificó doble habilitación concurrente, padrón inalterado tras una matrícula posterior y archivado, cierre bloqueado hasta finalizar el simulacro y cierre idempotente del ciclo. Se usó el recorrido de credenciales con VERIFICAR_ARCHIVO=si y VERIFICAR_PADRON=si.

### Conformidad y contratos

La comprobación transversal identificó la dependencia directa de Aplicación hacia ExcelJS. Se movió la lectura de XLSX al adaptador de infraestructura, conservando la validación y conectando el puerto LectorExcel por inyección. El recorrido de arquitectura verifica capas, consumo de APIs públicas y ciclos entre módulos. Los contratos compartidos ServicioIA y AlmacenArchivos permanecen como puertos de Aplicación.

La prueba transversal contrasta métodos y rutas Express con Swagger servido para los seis módulos y verifica los 401 sin sesión. Los recorridos Compose y las pruebas de las familias complementan la matriz con cuerpos, permisos, estados de conflicto y respuestas de negocio relevantes. Tarea 6 aprobada con 441 pruebas en 91 suites.

### Tarea 7 y cobertura

La validación controlada PostgreSQL/Redis y el estado actualizado de AC01–AC08 están en [Sprint 2](../../docs/sprint-2.md#resultados-controlados-de-la-etapa-de-validación). Jest aprobó 446 pruebas en 94 suites. Cobertura global 84,40 % líneas y 75,02 % ramas. Usuarios 81,58 % y 72,45 %. Rendición 75,41 % y 63,30 %. Ranking y Reportes 92,21 % y 77,62 %. Las pruebas de infraestructura real se mantienen como evidencia separada del porcentaje instrumentado por Jest.

### Revisión final de cobertura

Se añadieron cinco escenarios de transacción del padrón. Verifican reversión si falla la escritura de miembros, el bloqueo de habilitación para simulacros legados, inexistentes o en cierre, y la diferencia entre legado, miembro vigente y miembro desvinculado. Las evidencias Compose previas cubren descarga concurrente, vencimiento, revocación de JWT, recuperación por DNI y Excel, permisos y cierre. Esas ejecuciones no forman parte del porcentaje instrumentado.

Jest aprobó 451 pruebas en 95 suites. Global: 85,16 % líneas y 76,00 % ramas. Módulos afectados, líneas/ramas: Usuarios 81,58/72,45, Rendición 81,50/73,94, Ranking 92,21/77,62, Banco 86,98/78,70. Todos superan el objetivo recomendado 80/70. El global permanece por debajo del cierre de los seis módulos. Las brechas principales de Jest están en las rutas de ciclos y archivado, la persistencia de recuperación y auditoría y ramas de autorización o cierres repetidos. Los recorridos reales aportan evidencia complementaria para los caminos funcionales, pero no sustituyen la cobertura de cada rama.

### Humo de la tarea 8

Paso de humo completado: 3 VU, 3 iteraciones, 35 solicitudes, 24 comprobaciones y cero errores técnicos. PostgreSQL, Redis y RabbitMQ quedaron operativos en la prueba. Ver [plan, matriz y resultados](../../docs/sprint-2.md#humo-k6-y-autorización-pendiente-de-la-campaña) y [evidencia original](../../docs/evidencias/humo-k6/). Los escalones superiores permanecen pendientes de autorización.

### Resultado de la campaña autorizada

El escalón de 50 VU reconcilió HU11 y procesó los 50 resultados sin duplicados, con 0/670 errores técnicos. Se detuvo el escalado por incumplir el p95 de REST habitual (3 643,08 ms) y cierre a nota (5 910,30 ms). No se modificó el backend. La tarea 8 sigue abierta para perfilado y validación de capacidad. [Resultados y matriz AC01–AC08](../../docs/sprint-2.md#campaña-de-carga-primer-escalón-y-detención).

### Diagnóstico de rendimiento a 50 VU

El escalón de diagnóstico repitió 50 VU con el backend original, añadiendo instrumentación local de métricas agregadas en API y worker. Conservó la integridad de 50 intentos y resultados, y produjo p95 de REST habitual de 2,96 s y de cierre a nota de 7,33 s. La instrumentación añade coste y las cifras se registran separadas del escenario sin instrumentar.

En 17 ventanas del backend se observaron 2 176 adquisiciones del pool, máximo 1 762,57 ms y máximo de los p95 por ventana de 1 676,58 ms. El worker registró máximo de pool de 100,68 ms, lectura de examen de 5,49 ms y operaciones en resultados de 29,28 ms. La API abrió 50 conexiones RabbitMQ para 50 cierres, con máximo de 373,87 ms por conexión, y el código recorría la bandeja en serie. Son dos cuellos observados. Redis alcanzó 522,31 ms medidos desde Node, pero la demora máxima de su event loop fue 477,10 ms. Esta medición de extremo a extremo no permite atribuir la demora al servidor Redis ni aislar tiempo de ejecución SQL. Las 51 comparaciones bcrypt alcanzaron máximo 826,72 ms medidos desde Node. Los planes locales anteriores respaldan los índices básicos en las lecturas revisadas; aún no hay evidencia que justifique un índice nuevo.

### Revalidación tras optimizar

Publicación de cierres por lote y pool configurable en el backend. Humo de 3 VU conforme. A 50 VU la nota pasó a 1 853,50 ms, con HU11 e integridad conservados. REST habitual (4 849,45 ms) y registro (1 017,69 ms) excedieron los límites. Se detuvo la campaña en 50 VU. Ver [comparación, evidencia y matriz](../../docs/sprint-2.md#optimización-y-revalidación-de-ac01). No se requiere una migración ni una modificación de OpenAPI.

### Comparación de pools y perfil separado de autenticación

El backend 401e078, con publicación por lotes, ejecutó cohortes sintéticas equivalentes de 50 VU, primero con pool 10 y después con pool 20, usando el mismo perfil local y la misma VM. Las cohortes eran nuevas dentro del mismo proyecto y las tablas conservaron los datos anteriores. Una ejecución por configuración no separa la variación entre repeticiones ni el efecto del orden.

| Pool | REST p95 | Marca p95 | Nota p95 | Ranking p95 | Cierre general a ranking | HTTP / s | Espera de pool máxima / cola muestreada máxima | Demora máxima del loop |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 3717,60 ms | 437,82 ms | 2619,50 ms | 101,07 ms | 2035 ms | 35,41 | 2568,52 ms / 44 | 556,79 ms |
| 20 | 3705,02 ms | 1162,07 ms | 1655,75 ms | 214,33 ms | 2047 ms | 31,28 | 2950,39 ms / 32 | 780,14 ms |

Ambas corridas observaron 50 VU, 50 iteraciones completas, 353 comprobaciones y cero errores técnicos. PostgreSQL reconcilió 50 inscritos, intentos y notas esperadas. El perfil observó 10 y 20 conexiones ocupadas en sus respectivos máximos, y dos conexiones RabbitMQ de publicación por corrida. RSS máxima observada de API: 117,39 y 117,75 MiB. La espera de pool se mide al adquirir la conexión, por separado de la duración cliente de las consultas. La demora del event loop puede afectar ambas mediciones. Se seleccionó 10: ambas cumplen nota y ranking, REST sigue fuera del objetivo y 10 conserva el margen de registro.

El perfil dedicado usó las mismas diez cuentas dos veces, con y sin instrumentación. Cada ejecución midió diez logins en serie y diez con concurrencia de hasta diez, cada uno seguido de una consulta protegida. Login p95 en serie/paralelo: 97,74/792,02 ms perfilado y 97,75/883,03 ms sin perfil. Consulta protegida p95: 7,43/357,84 ms y 6,96/326,20 ms respectivamente. La muestra no aísla un coste estable del perfil. En la ventana perfilada, máximos medidos: bcrypt 203,56 ms, consulta por correo 205,85 ms, consulta por ID 142,82 ms, emisión JWT 1,75 ms, verificación JWT 1,64 ms, adquisición del pool 0,51 ms y event loop 209,85 ms. Diez comparaciones bcrypt de diez rondas en un proceso separado usaron 729,38 ms de CPU y 709,99 ms de reloj. Esto confirma coste de CPU y que el tiempo de consulta observado incluye planificación del proceso; no demuestra que el servidor SQL tarde 205,85 ms.

El primer arranque del perfil no pudo conectar al HTTP. El guion se corrigió para esperar /health y la repetición completó ambas variantes. No se usaron tokens precalculados ni se modificaron el hash, JWT o la consulta de usuario activo. Evidencias: [pool 10](../../docs/evidencias/campana-k6/vu-50-20261125-223829/), [pool 20](../../docs/evidencias/campana-k6/vu-50-20261125-223927/) y [autenticación](../../docs/evidencias/campana-k6/autenticacion-20261125-224039/).

### Revalidación oficial con pool 10

La API usa 10 conexiones por defecto y mantiene su configuración por entorno. El humo sin perfil aprobó. A 50 VU se completaron las 50 iteraciones, pero REST habitual llegó a 7 898,74 ms y registro a 1 056,23 ms, por encima de sus límites. La nota quedó en 4 873,20 ms y el ranking en 235,84 ms. PostgreSQL verificó 50 inscritos, 50 intentos finalizados y 50 notas esperadas, Redis respondió y las colas de RabbitMQ quedaron vacías. Se detuvo el escalado. La tarea 8 y la validación de capacidad siguen pendientes. Véase la [matriz actualizada y las evidencias](../../docs/sprint-2.md#revalidación-oficial-con-pool-10).

### Revalidación acotada posterior a la consolidación web

Se conservan el guion k6, los umbrales, una marca por intento, el pool API de 10 y el criterio de parada. El proyecto Compose aislado es nuevo, sin puertos publicados, con el backend compilado desde e0b4416, k6 1.0.0 y ambos proveedores simulados. Se suministran credenciales sintéticas al ejecutor mediante su entorno, con preparación independiente de la evidencia. La conciliación añade conteos de intentos y resultados duplicados. El caso k6 no reenvía deliberadamente una marca. La idempotencia ante reenvío sigue cubierta por la regresión funcional.

La evidencia anterior demostró el coste de CPU de bcrypt y el aumento de latencia al concentrar los inicios de sesión. También mostró espera de conexiones y demora del event loop. El perfil no aisló cuánto contribuyó cada factor al p95 oficial. Los tiempos observados desde Node incluyen planificación, por lo que los picos de Redis y de consultas no demuestran saturación de sus servidores. La publicación por lotes ya redujo aperturas de RabbitMQ de 50 a 2 en la comparación instrumentada y corrigió el cuello de la nota observado entonces. Los planes históricos revisados no justifican un índice nuevo.

En la revalidación el humo de 3 VU pasó y se habilitó exactamente una corrida de 50. A 50 VU pasó el p95 de registro (570,98 ms), nota (2248,30 ms), ranking (34,84 ms) y errores (0/493). REST habitual quedó en 3451,14 ms y detuvo el escalamiento. Inicio concentró 38 de las 41 muestras REST superiores a 2 s. La conciliación confirmó 50 notas esperadas y cero duplicados. Los resultados, percentiles y límites de interpretación están en [Sprint 2](../../docs/sprint-2.md#revalidación-acotada-de-3-y-50-vu--26-de-noviembre-de-2026). No se justificó una optimización de producción a partir de esta comparación.
