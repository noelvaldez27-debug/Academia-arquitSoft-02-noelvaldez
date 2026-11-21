# Tareas — Módulo Gestión de Usuarios

> Basado en: HU01, HU02, HU14 | RF01, RF02, RF19 | RC09 | AC04 | ADR-007, ADR-008 | Criterios CA-U01 a CA-U13 de `specs/usuarios/spec.md`. Ruta del módulo: `src/modules/usuarios/`
> Requiere: `specs/base/tasks.md` completo (proyecto Node.js + TypeScript, Docker, PostgreSQL y CI ya funcionando).
>
> Reglas de este módulo:
> - Cada tarea que agrega código incluye sus pruebas con Jest. Las pruebas unitarias no usan base de datos, red ni la IA real.
> - Toda variable de entorno nueva se propone con su nombre antes de agregarla, se documenta en `.env.example` y se pasa al servicio `backend` de `docker-compose.yml`, con valores de ejemplo falsos.
> - Toda librería nueva (hash de contraseñas, JWT, subida de archivos, lectura de Excel) se propone y se justifica antes de instalarla, con `npm view` y `npm audit`. No se usa ningún ORM.
> - La imagen final de Docker solo contiene `dist/` y las dependencias de producción. Todo lo que el módulo necesite en ejecución (archivos .sql de migraciones, scripts de migración y de arranque) debe llegar a la imagen y ejecutarse con `node` sobre `dist/`, no con `ts-node`.
> - Si una tarea contradice `specs/usuarios/spec.md`, el agente se detiene y pregunta: no modifica la especificación por su cuenta.
> - Las tareas 18 a 21 (carga masiva) pueden dejarse para el final del módulo si los módulos 2 a 6 necesitan avanzar antes.

- [ ] 1. Crear la estructura del módulo usuarios: dominio, aplicacion, infraestructura, presentacion, usuarios.module.ts e index.ts
- [ ] 2. Mecanismo simple de migraciones SQL, compartido con los demás módulos: archivos .sql numerados que un script aplica en orden y registra en una tabla de control, sin ORM ni librerías nuevas. El diseño se propone antes de escribir (dónde van los archivos y cómo se ejecuta con docker compose). Como el Dockerfile hoy solo copia `dist/`, esta tarea puede modificarlo únicamente para que los archivos .sql lleguen a la imagen, y el script se ejecuta con `node` dentro del contenedor. Se documenta en `docs/despliegue.md`
- [ ] 3. Dominio: entidad Usuario (nombre, DNI, correo, rol, activo), roles (Postulante, Docente, Administrador, Encargado) y puerto usuario-repository.ts
- [ ] 4. Infraestructura: postgres-usuario-repository.ts (PostgreSQL, RC07) y la migración de la tabla de usuarios, con DNI único para postulantes y docentes, correo único y estado activo. Las pruebas del repositorio usan un pool simulado, sin Docker
- [ ] 5. Generación automática de credenciales para postulantes y docentes (RF02, RF19, HU02, CA-U02): usuario dni@sofia.edu y contraseña inicial igual al DNI, guardada con hash (AC04). La librería de hash se propone y se justifica antes de instalarla
- [ ] 6. Caso de uso: registrar estudiante con nombre y DNI (RF01, HU01, CA-U01). Lo ejecutan el Administrador o el Encargado; no existe autoregistro (RC09). Debe quedar como una operación interna reutilizable, que también usará la carga masiva (tarea 20)
- [ ] 7. Caso de uso: registrar docente con nombre y DNI (RF19, HU14, CA-U03). Lo ejecuta solo el Administrador y reutiliza la generación de credenciales de la tarea 5
- [ ] 8. Script de arranque (seed) que crea el primer Administrador con nombre, correo y contraseña tomados de variables de entorno, sin valor de respaldo: si falta alguna, falla con un mensaje claro. No crea otro si ya existe un usuario con rol Administrador (CA-U04). Se compila a `dist/`, se ejecuta con `node` (por ejemplo con `docker compose exec backend`) y se documenta en `docs/despliegue.md`
- [ ] 9. Caso de uso: iniciar sesión y emitir JWT con duración configurable por variable de entorno; un usuario desactivado recibe el mismo error genérico que unas credenciales incorrectas (ADR-007, CA-U05). Si JWT_SECRET falta, o empieza por `cambiar_` cuando NODE_ENV es production, falla con un mensaje claro (hay dos valores de ejemplo: el de `.env.example` y el de respaldo del compose). La librería de JWT se propone y se justifica antes de instalarla
- [ ] 10. Middleware de autenticación y autorización por rol, que además comprueba en cada petición que el usuario siga activo (AC04, ADR-007, CA-U06)
- [ ] 11. Presentación: usuario.controller.ts y usuario.routes.ts con los endpoints de registrar estudiante, registrar docente e iniciar sesión, documentados en OpenAPI/Swagger (ADR-008)
- [ ] 12. Caso de uso: cambiar la propia contraseña, con contraseña actual y largo mínimo; es opcional para todos los roles (CA-U08). Incluye su endpoint y su documentación OpenAPI
- [ ] 13. Caso de uso: cambiar el correo del Administrador, con su contraseña actual (CA-U09). Incluye su endpoint y su documentación OpenAPI
- [ ] 14. Caso de uso: listar usuarios con filtro por rol; el Administrador ve todos y el Encargado solo postulantes; nunca contraseñas ni hashes (CA-U10). Incluye su endpoint y su documentación OpenAPI
- [ ] 15. Caso de uso: desactivar y reactivar usuario sin borrarlo; no se permite desactivarse a sí mismo ni al último Administrador (CA-U11). Incluye sus endpoints y su documentación OpenAPI
- [ ] 16. Caso de uso: crear cuentas de Administrador y de Encargado, con nombre, correo y contraseña inicial definidos por quien las crea; excepción a la regla del DNI de RC09 (CA-U12). Incluye su endpoint y su documentación OpenAPI
- [ ] 17. Exponer la API pública del módulo en index.ts, solo mediante puertos: autenticar y autorizar por rol (para que los otros módulos protejan sus rutas) y consultar un usuario por su identificador, sin contraseñas ni hashes (CA-U07)
- [ ] 18. Infraestructura: migración de la tabla de cargas masivas (estado, totales, errores por fila) y su repositorio (CA-U13)
- [ ] 19. Lectura y validación del archivo .xlsx con las columnas Nombre y DNI: tipo de archivo, tamaño y número máximo de filas configurables por variables de entorno (CA-U13). La librería para leer Excel y la que recibe archivos subidos se proponen y se justifican antes de instalarlas
- [ ] 20. Caso de uso: procesar la carga masiva en segundo plano y por lotes, reutilizando la operación de la tarea 6; los DNI existentes se omiten (también los desactivados, que no se reactivan), las filas inválidas se rechazan con su número y motivo, y una carga interrumpida se reanuda subiendo de nuevo el archivo (CA-U13)
- [ ] 21. Endpoints de la carga masiva: subir el archivo (responde de inmediato con un identificador) y consultar el estado y el resultado de la carga, con su documentación OpenAPI (CA-U13)
- [ ] 22. Verificar el módulo de punta a punta con docker compose up: aplicar las migraciones y crear el primer Administrador dentro del contenedor, iniciar sesión, registrar un estudiante y probar los endpoints desde Swagger. Es la primera conexión real del backend con PostgreSQL
- [ ] 23. Verificar que todos los endpoints del módulo aparecen en OpenAPI/Swagger y coinciden con lo que responde el servidor (CA-U07, ADR-008), y completar las pruebas unitarias con Jest de los casos de uso que no estén cubiertas
- [ ] 24. Verificar el reporte de cobertura de Jest y que las pruebas pasen en GitHub Actions

## Decisiones cerradas (antes estaban pendientes)
- Las cuentas de Docentes las crea el Administrador, con el mismo formato de credenciales que los postulantes (HU14, RF19, RC09)
- El primer Administrador se crea con el script de la tarea 8, y el script no crea otro mientras exista algún Administrador
- Las cuentas de Administrador y de Encargado las crea un Administrador, con correo y contraseña inicial definidos por él: excepción del equipo a la regla del DNI de RC09
- Los usuarios no se borran: se desactivan, para conservar el historial de exámenes y resultados
- El cambio de contraseña es opcional para todos; solo el Administrador puede cambiar su correo
- La carga masiva acepta solo .xlsx con Nombre y DNI, se procesa en segundo plano, y se puede repetir sin errores por cuentas ya existentes

## Pendiente de confirmar
- Rol Encargado aparte (opción A, la que asumen estas tareas) o solo administradores (opción B). Con la B se quita el rol Encargado de las tareas 3, 6, 14, 16, 19 y 20
- Sede y carrera del postulante: RF10 pide rankings por carrera y por sede, y nada define dónde se guardan. Si se guardan en este módulo, cambian las tareas 3, 4, 6, 19 y 20 (y las columnas del Excel)
- Nombre en un solo campo o en nombres y apellidos
- Duración del JWT (propuesta: 8 horas, configurable) y largo mínimo de contraseña (propuesta: 8 caracteres)
- Si el Administrador podrá restablecer la contraseña de quien la olvide (hoy no está incluido)
- Reactivar usuarios (tarea 15) es una propuesta que falta confirmar
