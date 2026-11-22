# Tareas — Módulo Gestión de Usuarios

> Basado en: HU01, HU02, HU14 a HU22 | RF01, RF02, RF19 a RF26 | RC09, RC15, RC16 | AC04, AC05 | ADR-007, ADR-008, ADR-015, ADR-016 | Criterios CA-U01 a CA-U14 de `specs/usuarios/spec.md`. Ruta del módulo: `src/modules/usuarios/`
> Requiere: `specs/base/tasks.md` completo (proyecto Node.js + TypeScript, Docker, PostgreSQL y CI ya funcionando).
>
> Reglas de este módulo:
> - Cada tarea que agrega código incluye sus pruebas con Jest. Las pruebas unitarias no usan base de datos, red ni la IA real.
> - Toda variable de entorno nueva se propone con su nombre antes de agregarla, se documenta en `.env.example` y se pasa al servicio `backend` de `docker-compose.yml`, con valores de ejemplo falsos.
> - Toda librería nueva (hash de contraseñas, JWT, subida de archivos, lectura de Excel) se propone y se justifica antes de instalarla, con `npm view` y `npm audit`. No se usa ningún ORM.
> - La imagen final de Docker solo contiene `dist/` y las dependencias de producción. Todo lo que el módulo necesite en ejecución (archivos .sql de migraciones, scripts de migración y de arranque) debe llegar a la imagen y ejecutarse con `node` sobre `dist/`, no con `ts-node`.
> - Si una tarea contradice `specs/usuarios/spec.md` o algo de `docs/01-analisis-de-sistema/`, el agente se detiene y pregunta: no modifica la especificación por su cuenta.
> - Las tareas 19 a 22 (carga masiva) pueden dejarse para el final del módulo si los módulos 2 a 6 necesitan avanzar antes.

- [x] 1. Crear la estructura del módulo usuarios: dominio, aplicacion, infraestructura, presentacion, usuarios.module.ts e index.ts
- [x] 2. Mecanismo simple de migraciones SQL, compartido con los demás módulos (ADR-015): archivos .sql numerados que un script aplica en orden y registra en una tabla de control, sin ORM ni librerías nuevas. El diseño se propone antes de escribir (dónde van los archivos y cómo se ejecuta con docker compose). Como el Dockerfile hoy solo copia `dist/`, esta tarea puede modificarlo únicamente para que los archivos .sql lleguen a la imagen, y el script se ejecuta con `node` dentro del contenedor. Se documenta en `docs/despliegue.md`
- [x] 3. Dominio: entidad Usuario (nombre, DNI, correo, rol, activo, sede, carrera), roles (Postulante, Docente, Administrador), alcance del Administrador (general, sin sede, o de sede, con una sede), entidad Sede, y puertos usuario-repository.ts y sede-repository.ts
- [x] 4. Infraestructura: migraciones y repositorios de sedes y de usuarios (RC07, RC15). La tabla de sedes se siembra con Hana, Urin y Central. La tabla de usuarios exige DNI único para postulantes y docentes, correo único, estado activo, sede para postulantes y administradores de sede, y carrera para postulantes. Un índice único parcial garantiza que exista un solo administrador general. Las pruebas del repositorio usan un pool simulado, sin Docker
- [x] 5. Generación automática de credenciales para postulantes y docentes (RF02, RF19, HU02, CA-U02): usuario dni@sofia.edu y contraseña inicial igual al DNI, guardada con hash (AC04). La librería de hash se propone y se justifica antes de instalarla
- [x] 6. Caso de uso: registrar estudiante con nombre, DNI, sede y carrera (RF01, RF22, HU01, CA-U01). Lo ejecuta el administrador general (cualquier sede) o el administrador de sede (solo su sede); no existe autoregistro (RC09). La carrera se normaliza (sin espacios sobrantes y en mayúsculas). Debe quedar como una operación interna reutilizable, que también usará la carga masiva (tarea 21)
- [x] 7. Caso de uso: registrar docente con nombre y DNI (RF19, HU14, CA-U03). Lo ejecuta solo el administrador general y reutiliza la generación de credenciales de la tarea 5
- [x] 8. Script de arranque (seed) que crea el administrador general con nombre, correo y contraseña tomados de variables de entorno, sin valor de respaldo: si falta alguna, falla con un mensaje claro. No crea otro si ya existe un administrador general (CA-U04). Se compila a `dist/`, se ejecuta con `node` (por ejemplo con `docker compose exec backend`) y se documenta en `docs/despliegue.md`
- [x] 9. Caso de uso: iniciar sesión y emitir JWT con identificador, rol y sede, y duración configurable por variable de entorno; un usuario desactivado recibe el mismo error genérico que unas credenciales incorrectas (ADR-007, CA-U05). Si JWT_SECRET falta, o empieza por `cambiar_` cuando NODE_ENV es production, falla con un mensaje claro (hay dos valores de ejemplo: el de `.env.example` y el de respaldo del compose). La librería de JWT se propone y se justifica antes de instalarla
- [ ] 10. Middleware de autenticación y autorización por rol y por sede, que además comprueba en cada petición que el usuario siga activo y toma su rol y su sede actuales de la base de datos (AC04, ADR-007, RC15, CA-U06)
- [ ] 11. Presentación: usuario.controller.ts y usuario.routes.ts con los endpoints de registrar estudiante, registrar docente e iniciar sesión, documentados en OpenAPI/Swagger (ADR-008)
- [ ] 12. Caso de uso: cambiar la propia contraseña, con contraseña actual y largo mínimo; es opcional para todos los roles (RF26, CA-U08). Incluye su endpoint y su documentación OpenAPI
- [ ] 13. Caso de uso: cambiar el propio correo del administrador, con su contraseña actual (RF26, CA-U09). Incluye su endpoint y su documentación OpenAPI
- [ ] 14. Caso de uso: listar usuarios con filtro por rol y por sede; el administrador general ve todos y el administrador de sede solo los postulantes de su sede; nunca contraseñas ni hashes (RF23, CA-U10). Incluye su endpoint y su documentación OpenAPI
- [ ] 15. Caso de uso: desactivar y reactivar usuario sin borrarlo (RF24, RC16, CA-U11); el administrador de sede solo puede hacerlo con postulantes de su sede; no se permite desactivarse a sí mismo ni al administrador general. Incluye sus endpoints y su documentación OpenAPI
- [ ] 16. Caso de uso: crear cuentas de administrador de sede, con nombre, correo, contraseña inicial y sede definidos por el administrador general; excepción a la regla del DNI de RC09 (RF25, HU19, CA-U12). No se puede crear otro administrador general. Incluye su endpoint y su documentación OpenAPI
- [ ] 17. Caso de uso: listar sedes y crear una sede nueva, esta última solo para el administrador general, sin cambiar código (RF22, AC05, CA-U14). Incluye sus endpoints y su documentación OpenAPI
- [ ] 18. Exponer la API pública del módulo en index.ts, solo mediante puertos: autenticar y autorizar por rol y sede (para que los otros módulos protejan sus rutas) y consultar un usuario por su identificador, con su sede y su carrera y sin contraseñas ni hashes (CA-U07)
- [ ] 19. Infraestructura: migración de la tabla de cargas masivas (estado, sede, totales, errores por fila) y su repositorio (CA-U13)
- [ ] 20. Lectura y validación del archivo .xlsx con las columnas Nombre, DNI, Sede y Carrera: tipo de archivo, tamaño y número máximo de filas configurables por variables de entorno (CA-U13). La librería para leer Excel y la que recibe archivos subidos se proponen y se justifican antes de instalarlas
- [ ] 21. Caso de uso: procesar la carga masiva en segundo plano y por lotes mediante la cola de mensajes, según ADR-016 (el diseño de la cola y de quien la consume se propone antes de escribir), reutilizando la operación de la tarea 6; los DNI existentes se omiten (también los desactivados, que no se reactivan), las filas inválidas o de otra sede se rechazan con su número y motivo, y una carga interrumpida se reanuda subiendo de nuevo el archivo (RF21, HU15, CA-U13)
- [ ] 22. Endpoints de la carga masiva: subir el archivo (responde de inmediato con un identificador) y consultar el estado y el resultado de la carga, con su documentación OpenAPI (CA-U13)
- [ ] 23. Verificar el módulo de punta a punta con docker compose up: aplicar las migraciones y crear el administrador general dentro del contenedor, crear un administrador de sede, iniciar sesión con ambos, registrar un estudiante en cada sede, comprobar que el administrador de sede no puede ver ni registrar estudiantes de otra sede, y probar los endpoints desde Swagger. Es la primera conexión real del backend con PostgreSQL
- [ ] 24. Verificar que todos los endpoints del módulo aparecen en OpenAPI/Swagger y coinciden con lo que responde el servidor (CA-U07, ADR-008), y completar las pruebas unitarias con Jest de los casos de uso que no estén cubiertas
- [ ] 25. Verificar el reporte de cobertura de Jest y que las pruebas pasen en GitHub Actions

## Decisiones cerradas
- Hay tres roles (postulante, docente y administrador). El administrador tiene dos niveles: el general, único y con todas las sedes, y el de sede, varios por sede y con una sola sede (RC15)
- Los docentes los registra el administrador general, con el mismo formato de credenciales que los postulantes (HU14, RF19, RC09)
- El administrador general se crea con el script de la tarea 8, que no crea otro mientras exista uno. Las cuentas de administrador de sede las crea el administrador general, con correo y contraseña inicial definidos por él (excepción a la regla del DNI de RC09)
- Cada estudiante tiene sede y carrera. Las sedes viven en una tabla, no en el código (AC05)
- Los usuarios no se borran: se desactivan (RC16)
- El cambio de contraseña es opcional para todos; solo los administradores cambian su correo
- La carga masiva acepta solo .xlsx con Nombre, DNI, Sede y Carrera, se procesa en segundo plano, y se puede repetir sin errores por cuentas ya existentes

## Pendiente de confirmar
- Tope de alumnos por sede: no se asume ninguno. Si hay un máximo por sede, se agrega como requisito y cambian las tareas 6 y 21
- Carrera como texto normalizado (lo asumido) o como lista cerrada de carreras mantenida por el administrador general
- Si los docentes pertenecen a una sede (hoy no)
- Si el administrador de sede puede desactivar y reactivar postulantes de su sede (hoy sí)
- Nombre en un solo campo o en nombres y apellidos
- Duración del JWT (propuesta: 8 horas, configurable) y largo mínimo de contraseña (propuesta: 8 caracteres)
- Si el administrador podrá restablecer la contraseña de quien la olvide (hoy no está incluido)
