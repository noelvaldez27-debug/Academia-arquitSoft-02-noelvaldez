# Tareas — Módulo Gestión de Usuarios

> Basado en: HU01, HU02 | RF01, RF02 | RC09 | AC04 | ADR-007. Ruta del módulo: `src/modules/usuarios/`

- [ ] 1. Inicializar el proyecto Node.js + TypeScript (package.json, tsconfig, carpeta src/modules)
- [ ] 2. Crear la estructura del módulo usuarios: dominio, aplicacion, infraestructura, presentacion, usuarios.module.ts e index.ts
- [ ] 3. Dominio: entidad Usuario, roles (Postulante, Docente, Administrador) y puerto usuario-repository.ts
- [ ] 4. Infraestructura: postgres-usuario-repository.ts (PostgreSQL, RC07)
- [ ] 5. Caso de uso: registrar estudiante (RF01, HU01). Lo ejecuta el personal encargado; no existe autoregistro (RC09)
- [ ] 6. Generación automática de credenciales (RF02, HU02): usuario dni@sofia.edu y contraseña inicial igual al DNI, guardada cifrada (AC04)
- [ ] 7. Caso de uso: iniciar sesión y emitir JWT (ADR-007)
- [ ] 8. Middleware de autenticación y autorización por rol (AC04, ADR-007)
- [ ] 9. Presentación: usuario.controller.ts y usuario.routes.ts (API REST, ADR-008)
- [ ] 10. Exponer la API pública del módulo en index.ts para que otros módulos la usen mediante puertos
- [ ] 11. Pruebas unitarias de los casos de uso

## Pendiente de definir (no está en docs/)
- Cómo se crean las cuentas de Docentes y Administradores (los docs solo describen el registro de estudiantes)
