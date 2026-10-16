# Requisitos funcionales

## Lista de requisitos

| ID | Requisito funcional |
| --- | --- |
| RF01 | El sistema debe permitir al personal encargado registrar estudiantes. |
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

## Relación entre historias de usuario y requisitos funcionales

| Historia de usuario | Requisitos funcionales relacionados |
| --- | --- |
| HU01 Registrar estudiantes | RF01 |
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