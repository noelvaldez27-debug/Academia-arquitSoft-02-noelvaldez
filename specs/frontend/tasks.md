# Tareas del frontend

## Planificación

- [x] P1. Auditar repositorio, análisis, C4, ADR, SDD y contratos. Entregar especificación, inventario y propuesta para aprobación.

## Fase 0 · Fundamentos

- [x] F0.1. Registrar aprobación de la especificación y resolver el alcance de las referencias conocidas. Preparar SPA React/TypeScript/Tailwind, rutas base, estructura y compilación reproducible.
- [x] F0.2. Preparar marco accesible, componentes de formulario, carga/error/vacío, cliente REST, fixtures y ejecución local Compose/nginx. Verificar navegación directa, proxy y prueba de humo sin IA real.

## Fase 1 · Gestión de Usuarios (depende de F0)

- [x] F1.1. Implementar login, cambio inicial, cuenta, expiración y guardas por rol y sede. Verificar sesión revocada y acceso directo.
- [x] F1.2. Implementar sedes, altas, padrón de usuarios, condición, archivo, reactivación y ciclos. Verificar los permisos de ambos administradores.
- [x] F1.3. Implementar Excel normal y de nuevo ciclo, estados por fila y entregas temporales. Verificar test de un uso y recuperación de ID e historial.

- [x] F1.C. Consolidar búsqueda PostgreSQL y pruebas web, revisar historial saliente e incorporar frontend a CI. Publicar y verificar CI antes de la Fase 2.

## Fase 2 · Banco de Preguntas (depende de F1)

- [ ] F2.1. Implementar cursos, temas, asignaciones, preguntas y configuración de simulacros. Verificar permisos, orden y edición.
- [ ] F2.2. Implementar separatas, autorización, estado y revisión. Verificar formatos, procesamiento simulado, error y aprobación por propietario.

## Fase 3 · Rendición (depende de F1 y F2)

- [ ] F3.1. Implementar habilitación, acceso, reanudación y ambas modalidades. Verificar elegibilidad, versión congelada y cronómetro.
- [ ] F3.2. Implementar persistencia local y sincronización por revisiones, finalizar y mostrar estados del cierre general. Verificar AC07 en conexión intermitente, caducidad, recarga y sesión expirada.

## Fase 4 · Procesamiento de Resultados (depende de F3)

- [ ] F4.1. Implementar nota propia y sondeo controlado. Verificar pendiente, puntaje cero, desglose, autorización y tiempo visible local.

## Fase 5 · Ranking y Reportes (depende de F2–F4)

- [ ] F5.1. Implementar posición propia y ranking administrativo. Verificar publicación, filtros y privacidad.
- [ ] F5.2. Implementar reportes por perfil y exportaciones. Verificar padrón desconocido, tasa cero, restricciones y descargas.

## Fase 6 · Analítica (depende de F2 y F4; reutiliza filtros y tablas de F5)

- [ ] F6.1. Implementar historial, gráficos, agregados y recomendación. Verificar accesibilidad, datos históricos, permiso docente y casos sin evidencia.
- [ ] F6.2. Ejecutar recorridos de los seis módulos, evaluación AC06 y pruebas de navegador, diseño adaptable y accesibilidad. Registrar evidencias, brechas y preparación para la integración final. La tarea 8 de validación de backend mantiene su planificación separada.
