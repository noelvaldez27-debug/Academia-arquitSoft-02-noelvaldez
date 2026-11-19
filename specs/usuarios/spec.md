# Especificación — Módulo Gestión de Usuarios

> Historias: HU01, HU02, HU14 | Requisitos: RF01, RF02, RF19 | Restricciones: RC09 | Atributos: AC04 | Decisiones: ADR-007, ADR-008
> Las tareas técnicas de este módulo están en `specs/usuarios/tasks.md`.

## Alcance
El módulo registra usuarios (postulantes y docentes), genera sus credenciales, autentica con JWT y controla el acceso por rol. No hay autoregistro de ningún usuario (RC09).

## Roles
Postulante, Docente y Administrador.

## Criterios de aceptación
Formato: Dado / Cuando / Entonces.

### CA-U01 Registrar estudiante (HU01, RF01)
- Dado un Administrador autenticado, cuando registra un estudiante con un DNI válido, entonces se crea un usuario con rol Postulante.
- Dado un DNI que ya existe, cuando se intenta registrar de nuevo, entonces el sistema rechaza el registro con un error de conflicto.
- Dado un DNI que no tiene 8 dígitos numéricos, cuando se intenta registrar, entonces el sistema rechaza la solicitud con un error de validación.
- Dado un usuario sin sesión o con rol Postulante o Docente, cuando intenta registrar un estudiante, entonces el sistema responde con acceso denegado.

### CA-U02 Generación automática de credenciales (HU02, RF02)
- Dado un estudiante recién registrado, cuando se crea su cuenta, entonces su usuario es `dni@sofia.edu` y su contraseña inicial es su DNI.
- Dada una cuenta creada, cuando se consulta la base de datos, entonces la contraseña está guardada con hash y nunca en texto plano (AC04).
- Dada cualquier respuesta de la API o registro de logs, entonces no contiene la contraseña ni su hash.

### CA-U03 Registrar docente (HU14, RF19)
- Dado un Administrador autenticado, cuando registra un docente con un DNI válido, entonces se crea un usuario con rol Docente y credenciales generadas con la misma regla que los postulantes.
- Dado un usuario que no es Administrador, cuando intenta registrar un docente, entonces el sistema responde con acceso denegado.
- Dado un DNI ya registrado, cuando se intenta registrar un docente con ese DNI, entonces el sistema rechaza el registro con un error de conflicto.

### CA-U04 Primer Administrador
- Dado un sistema recién desplegado sin usuarios, cuando se ejecuta el script de arranque, entonces se crea un Administrador con los datos tomados de variables de entorno.
- Dado un sistema que ya tiene un Administrador, cuando se vuelve a ejecutar el script, entonces no crea duplicados.
- Los datos del primer Administrador no deben estar escritos en el código ni en el repositorio.

### CA-U05 Iniciar sesión (ADR-007)
- Dadas credenciales correctas, cuando el usuario inicia sesión, entonces recibe un JWT que incluye su identificador y su rol.
- Dadas credenciales incorrectas, cuando el usuario intenta iniciar sesión, entonces recibe un error de autenticación que no revela si falló el usuario o la contraseña.
- Dado un JWT vencido o alterado, cuando se usa en una petición protegida, entonces el sistema responde con acceso no autorizado.

### CA-U06 Control de acceso por rol (AC04)
- Dado un endpoint restringido a un rol, cuando lo invoca un usuario con otro rol, entonces el sistema responde con acceso denegado.
- Dado un endpoint protegido, cuando se invoca sin JWT, entonces el sistema responde con acceso no autorizado.

### CA-U07 API pública del módulo
- Los otros módulos solo acceden a datos de usuarios mediante los puertos expuestos en `index.ts`, nunca a la tabla ni al repositorio directamente.
- Todos los endpoints del módulo están documentados en OpenAPI/Swagger (ADR-008).

## Base de datos y caché
- PostgreSQL: tabla de usuarios con DNI único, correo único, hash de contraseña, rol y estado activo.
- Redis: no se usa en este módulo.

## Pendiente de confirmar
- Qué otros datos del estudiante se registran además del DNI (por ejemplo nombres, sede y carrera). Deben salir del modelo de datos de `docs/`.
- Tiempo de vida del JWT.
- Si el sistema obliga a cambiar la contraseña en el primer inicio de sesión.