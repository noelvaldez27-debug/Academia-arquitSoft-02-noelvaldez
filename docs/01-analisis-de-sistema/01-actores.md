# Actores del sistema

## Contexto del caso

La Academia Preuniversitaria Sofía (sedes Hana, Urin y Central) toma sus exámenes de control en papel y publica los resultados recién el lunes siguiente. Los postulantes no tienen seguimiento de su progreso ni recomendaciones personalizadas de refuerzo, y su información se pierde al iniciar un nuevo ciclo de preparación.

El sistema virtualizará los simulacros de examen, mostrará la nota de forma inmediata, dará seguimiento al progreso del postulante y usará inteligencia artificial para recomendar un refuerzo académico personalizado.

Además, los docentes podrán subir sus separatas para que la inteligencia artificial proponga preguntas a partir de ellas, que el docente revisa y aprueba antes de pasar al banco de preguntas.

## Actores

| Actor | Funciones |
| --- | --- |
| **Postulante** | Rendir simulacros, consultar su nota de forma inmediata, ver su ranking general y por carrera, revisar su desempeño por curso y su evolución en el tiempo, y recibir recomendaciones de refuerzo académico. |
| **Docente** | Consultar las preguntas y temas con mayor tasa de error a nivel grupal, revisar reportes de desempeño, subir separatas y revisar y aprobar las preguntas que la inteligencia artificial genera a partir de ellas. |
| **Administrador** | Gestionar a los usuarios del sistema, registrar a los estudiantes (de uno en uno o con una carga masiva desde Excel), cargar y editar el banco de preguntas por curso, y exportar resultados y cuadro de méritos. Existen dos niveles: el administrador general y los administradores de sede (ver la sección siguiente). |
| **Servicio de Inteligencia Artificial** | Identificar los cursos débiles, generar la recomendación de refuerzo personalizada y proponer preguntas a partir del contenido de las separatas subidas por el docente. |

## Niveles del Administrador

Cada sede tiene sus propios estudiantes. El rol Administrador tiene dos niveles, según las sedes con las que trabaja.

| Nivel | Cuántos hay | Alcance | Funciones |
| --- | --- | --- | --- |
| **Administrador general** | Uno solo | Todas las sedes | Registrar docentes, crear las cuentas de los administradores de sede, registrar estudiantes de cualquier sede (de uno en uno o con Excel), consultar, desactivar y reactivar a cualquier usuario, cargar y editar el banco de preguntas por curso, y exportar resultados y cuadro de méritos. |
| **Administrador de sede** | Varios en cada sede | Solo su sede | Registrar estudiantes de su sede (de uno en uno o con Excel), consultar la lista de estudiantes de su sede, y desactivar y reactivar estudiantes de su sede. |

Un administrador de sede no puede ver ni modificar a los estudiantes de otras sedes. Ningún usuario se registra solo: las cuentas las crea siempre un administrador.