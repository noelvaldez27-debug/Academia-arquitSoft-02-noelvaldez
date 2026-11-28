# Requisitos funcionales

## Lista de requisitos

| ID | Requisito funcional |
| --- | --- |
| RF01 | El sistema debe permitir al administrador registrar estudiantes de uno en uno, indicando su nombre, DNI, sede y carrera. El administrador de sede solo puede registrar estudiantes de su sede. |
| RF02 | El sistema debe generar automáticamente las credenciales de acceso de cada postulante (usuario dni@sofia.edu y contraseña inicial igual a su DNI). |
| RF03 | El sistema debe permitir cargar y editar el banco de preguntas por curso. |
| RF04 | El sistema debe permitir rendir el examen completo dentro del sistema. |
| RF05 | El sistema debe permitir registrar las respuestas desde el celular en un examen impreso. |
| RF06 | El sistema debe guardar las respuestas primero en el dispositivo, sincronizarlas con el servidor y controlar el tiempo límite, bloqueando el envío una vez vencido. |
| RF07 | El sistema debe calcular automáticamente el puntaje de cada postulante al cierre del examen, en segundo plano. |
| RF08 | El sistema debe mostrar al postulante su nota individual de forma inmediata al enviar su examen. |
| RF09 | El sistema debe conservar el historial de resultados de cada postulante entre distintos ciclos de preparación. |
| RF10 | El sistema debe generar el ranking general y el ranking por carrera y por sede. |
| RF11 | El sistema debe mostrar el desempeño por curso y la evolución del postulante en el tiempo mediante gráficos. |
| RF12 | El sistema debe identificar las preguntas y temas con mayor tasa de error a nivel grupal. |
| RF13 | El sistema debe identificar los cursos débiles de cada postulante y generar una recomendación personalizada de refuerzo académico. |
| RF14 | El sistema debe permitir exportar los resultados y el cuadro de méritos. |
| RF15 | El sistema debe permitir al docente subir separatas en formato Word, PDF o imagen, rechazando los formatos no admitidos y los archivos que superen el tamaño máximo permitido. |
| RF16 | El sistema debe extraer el texto de cada separata subida en segundo plano, leyéndolo directamente en los archivos Word y PDF con texto, y mediante inteligencia artificial en las imágenes y PDF escaneados. |
| RF17 | El sistema debe generar, con apoyo de la inteligencia artificial, propuestas de preguntas con sus alternativas a partir del texto extraído de la separata. |
| RF18 | El sistema debe permitir al docente revisar, corregir, aprobar o descartar las preguntas propuestas, e incorporar al banco de preguntas únicamente las aprobadas. |
| RF19 | El sistema debe permitir al administrador general registrar docentes y generar automáticamente sus credenciales de acceso (usuario dni@sofia.edu y contraseña inicial igual a su DNI), sin autoregistro. |
| RF20 | El sistema debe permitir a todo usuario iniciar sesión con su correo y contraseña, y restringir cada función según su rol y, en el caso del administrador de sede, según su sede. |
| RF21 | El sistema debe permitir al administrador registrar estudiantes de forma masiva subiendo un archivo Excel con nombre, DNI, sede y carrera, procesarlo en segundo plano, omitir los DNI que ya existen, rechazar las filas inválidas indicando su número y motivo, y mostrar el resultado de la carga. El administrador de sede solo puede cargar estudiantes de su sede. |
| RF22 | El sistema debe asociar a cada estudiante con una sede y una carrera, y permitir agregar nuevas sedes sin afectar el resto del sistema. |
| RF23 | El sistema debe permitir al administrador consultar la lista de usuarios, con filtro por rol y por sede, sin mostrar nunca contraseñas. El administrador de sede solo ve a los estudiantes de su sede. |
| RF24 | El sistema debe permitir al administrador desactivar y reactivar usuarios sin borrarlos, para conservar el historial de exámenes y resultados. El administrador de sede solo puede hacerlo con estudiantes de su sede, y nadie puede desactivarse a sí mismo ni desactivar al único administrador general. |
| RF25 | El sistema debe crear al administrador general al ponerse en marcha, con datos tomados de la configuración, y permitirle crear las cuentas de los administradores de cada sede, definiendo su nombre, correo, contraseña inicial y sede. Existe un solo administrador general. |
| RF26 | El sistema debe permitir a todo usuario cambiar su propia contraseña de forma opcional, y al administrador cambiar su propio correo. |

## Relación entre historias de usuario y requisitos funcionales

| Historia de usuario | Requisitos funcionales relacionados |
| --- | --- |
| HU01 Registrar estudiantes | RF01, RF22 |
| HU02 Generar credenciales automáticas | RF02 |
| HU03 Gestionar banco de preguntas | RF03 |
| HU04 Rendir simulacro virtual | RF04, RF06, RF07 |
| HU05 Marcado rápido desde el celular | RF05, RF06 |
| HU06 Conocer la nota de forma inmediata | RF07, RF08 |
| HU07 Ver ranking | RF10 |
| HU08 Ver desempeño y evolución | RF09, RF11 |
| HU09 Recibir recomendación de refuerzo | RF13 |
| HU10 Consultar preguntas con mayor error | RF12 |
| HU11 Exportar resultados | RF14 |
| HU12 Subir separatas | RF15, RF16, RF17 |
| HU13 Revisar y aprobar preguntas generadas | RF18, RF03 |
| HU14 Registrar docentes | RF19 |
| HU15 Registrar estudiantes con un archivo Excel | RF21, RF22 |
| HU16 Trabajar solo con los estudiantes de mi sede | RF20, RF01, RF21, RF23, RF24 |
| HU17 Consultar la lista de usuarios | RF23 |
| HU18 Desactivar y reactivar usuarios | RF24 |
| HU19 Crear administradores de sede | RF25 |
| HU20 Iniciar sesión | RF20 |
| HU21 Cambiar mi contraseña | RF26 |
| HU22 Cambiar el correo del administrador | RF26 |
## Revisiones aprobadas para la etapa de validación del Sprint 2

- RF02 y RF26. Las nuevas emisiones de credenciales para postulantes mantienen el usuario por DNI, generan una contraseña provisional aleatoria y exigen su cambio tras el primer ingreso. El texto anterior conserva la decisión original y el cambio posterior sigue disponible para todos.
- RF21. Importación normal mantiene la omisión de todos los DNI existentes. La modalidad explícita para nuevo ciclo recupera solo postulantes archivados, previa validación del alcance administrativo y del vínculo con el ciclo. Los DNI activos se omiten en ambos modos.
- RF09 y RF24. El cierre académico archiva las cuentas afectadas e invalida sus sesiones, conservando los registros históricos y los vínculos de ciclo.

### Revisión posterior de credenciales para postulantes

La contraseña inicial nueva se genera aleatoriamente por defecto, no obliga a cambiarla y puede cambiarse voluntariamente desde Mi cuenta. La opción de DNI inicial solo se habilita con configuración explícita en `test` o `development`, apagada por defecto y destinada a datos sintéticos. Un restablecimiento administrativo genera credencial temporal de 24 horas y exige cambio antes de continuar. Las credenciales provisionales pendientes ya emitidas conservan su vigencia y obligación hasta resolverse. Esta revisión modifica para postulantes la ampliación previa de RF02/RF26; docentes y administradores mantienen su política.
