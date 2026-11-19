# Tareas — Módulo Gestión de Usuarios

> Basado en: HU01, HU02, HU14 | RF01, RF02, RF19 | RC09 | AC04 | ADR-007, ADR-008. Ruta del módulo: `src/modules/usuarios/`
> Requiere: `specs/base/tasks.md` completo (proyecto Node.js + TypeScript, Docker, PostgreSQL y CI ya funcionando).

- [ ] 1. Crear la estructura del módulo usuarios: dominio, aplicacion, infraestructura, presentacion, usuarios.module.ts e index.ts
- [ ] 2. Dominio: entidad Usuario, roles (Postulante, Docente, Administrador) y puerto usuario-repository.ts
- [ ] 3. Infraestructura: postgres-usuario-repository.ts (PostgreSQL, RC07) y creación de la tabla de usuarios
- [ ] 4. Generación automática de credenciales para todos los roles (RF02, RF19, HU02): usuario dni@sofia.edu y contraseña inicial igual al DNI, guardada con hash (AC04)
- [ ] 5. Caso de uso: registrar estudiante (RF01, HU01). Lo ejecuta el personal encargado (rol Administrador); no existe autoregistro (RC09)
- [ ] 6. Caso de uso: registrar docente (RF19, HU14). Lo ejecuta el Administrador y reutiliza la generación de credenciales de la tarea 4
- [ ] 7. Script de arranque (seed) que crea el primer Administrador con datos tomados de variables de entorno, documentadas en `.env.example`
- [ ] 8. Caso de uso: iniciar sesión y emitir JWT (ADR-007)
- [ ] 9. Middleware de autenticación y autorización por rol (AC04, ADR-007)
- [ ] 10. Presentación: usuario.controller.ts y usuario.routes.ts (API REST, ADR-008)
- [ ] 11. Exponer la API pública del módulo en index.ts para que otros módulos la usen mediante puertos
- [ ] 12. Documentar los endpoints del módulo con OpenAPI/Swagger
- [ ] 13. Pruebas unitarias de los casos de uso con Jest
- [ ] 14. Verificar el reporte de cobertura de Jest y que las pruebas pasen en GitHub Actions

## Decisiones cerradas (antes estaban pendientes)
- Las cuentas de Docentes las crea el Administrador, con el mismo formato de credenciales que los postulantes (HU14, RF19, RC09)
- El primer Administrador se crea con el script de arranque de la tarea 7