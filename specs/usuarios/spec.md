# Especificación — Módulo Gestión de Usuarios

> Historias: HU01, HU02, HU14 | Requisitos: RF01, RF02, RF19 | Restricciones: RC09 | Atributos: AC04 | Decisiones: ADR-007, ADR-008
> Las tareas técnicas de este módulo están en `specs/usuarios/tasks.md`.
> Los criterios CA-U08 a CA-U13, el rol Encargado y la excepción de credenciales de las cuentas de Administrador y Encargado son decisiones del equipo: no figuran en RF02, RF19 ni RC09, que fijan solo la regla `dni@sofia.edu` con contraseña inicial igual al DNI.

## Alcance
El módulo registra usuarios (postulantes, docentes, encargados y administradores), genera sus credenciales, autentica con JWT y controla el acceso por rol. No hay autoregistro de ningún usuario (RC09). Los postulantes se registran de a uno o con una carga masiva desde un archivo Excel; los docentes los registra el Administrador.

## Roles
- **Postulante.**
- **Docente.**
- **Administrador:** registra docentes y postulantes, crea cuentas de Administrador y de Encargado, lista, desactiva y reactiva usuarios, y puede cambiar su propio correo y contraseña. Es el "personal encargado" de RC09 junto con el Encargado.
- **Encargado** (rol propuesto, por confirmar): registra postulantes, de a uno o con carga masiva, y consulta la lista de postulantes. No registra docentes ni crea cuentas.

## Datos del usuario
- Estudiantes y docentes: nombre y DNI (8 dígitos numéricos). El correo y la contraseña inicial se generan a partir del DNI.
- Administradores y Encargados: nombre, correo y contraseña inicial definidos por quien crea la cuenta.
- Sede y carrera del postulante: por confirmar (ver «Pendiente de confirmar»).

## Criterios de aceptación
Formato: Dado / Cuando / Entonces.

### CA-U01 Registrar estudiante (HU01, RF01)
- Dado un Administrador o Encargado autenticado, cuando registra un estudiante con nombre y DNI válidos, entonces se crea un usuario con rol Postulante.
- Dado un DNI que ya existe, cuando se intenta registrar de nuevo, entonces el sistema rechaza el registro con un error de conflicto.
- Dado un DNI que no tiene 8 dígitos numéricos o un nombre vacío, cuando se intenta registrar, entonces el sistema rechaza la solicitud con un error de validación.
- Dado un usuario con rol Postulante o Docente, cuando intenta registrar un estudiante, entonces el sistema responde con acceso denegado.
- Dado un usuario sin sesión, cuando intenta registrar un estudiante, entonces el sistema responde con acceso no autorizado.

### CA-U02 Generación automática de credenciales (HU02, RF02)
- Dado un estudiante recién registrado, cuando se crea su cuenta, entonces su usuario es `dni@sofia.edu` y su contraseña inicial es su DNI.
- Dada una cuenta creada, cuando se consulta la base de datos, entonces la contraseña está guardada con hash y nunca en texto plano (AC04).
- Dada cualquier respuesta de la API o registro de logs, entonces no contiene la contraseña ni su hash.

### CA-U03 Registrar docente (HU14, RF19)
- Dado un Administrador autenticado, cuando registra un docente con nombre y DNI válidos, entonces se crea un usuario con rol Docente y credenciales generadas con la misma regla que los postulantes.
- Dado un usuario que no es Administrador, cuando intenta registrar un docente, entonces el sistema responde con acceso denegado.
- Dado un DNI ya registrado, cuando se intenta registrar un docente con ese DNI, entonces el sistema rechaza el registro con un error de conflicto.

### CA-U04 Primer Administrador
- Dado un sistema recién desplegado sin usuarios, cuando se ejecuta el script de arranque, entonces se crea un Administrador con el nombre, el correo y la contraseña tomados de variables de entorno.
- Dado un sistema que ya tiene al menos un usuario con rol Administrador, cuando se vuelve a ejecutar el script, entonces no crea otro Administrador, aunque el Administrador existente haya cambiado su correo.
- Los datos del primer Administrador no deben estar escritos en el código ni en el repositorio.
- Esta cuenta es una excepción a la regla del DNI de RC09.

### CA-U05 Iniciar sesión (ADR-007)
- Dadas credenciales correctas de un usuario activo, cuando inicia sesión, entonces recibe un JWT que incluye su identificador y su rol, con una duración configurable.
- Dadas credenciales incorrectas, o las de un usuario desactivado, cuando intenta iniciar sesión, entonces recibe un error de autenticación que no revela si falló el usuario o la contraseña, ni si la cuenta está desactivada.
- Dado un JWT vencido o alterado, cuando se usa en una petición protegida, entonces el sistema responde con acceso no autorizado.

### CA-U06 Control de acceso por rol (AC04)
- Dado un endpoint restringido a un rol, cuando lo invoca un usuario con otro rol, entonces el sistema responde con acceso denegado.
- Dado un endpoint protegido, cuando se invoca sin JWT, entonces el sistema responde con acceso no autorizado.

### CA-U07 API pública del módulo
- Los otros módulos solo acceden a datos de usuarios mediante los puertos expuestos en `index.ts`, nunca a la tabla ni al repositorio directamente.
- Todos los endpoints del módulo están documentados en OpenAPI/Swagger (ADR-008).

### CA-U08 Cambiar la propia contraseña (decisión del equipo)
- Dado un usuario autenticado de cualquier rol, cuando envía su contraseña actual correcta y una contraseña nueva válida, entonces la contraseña se actualiza y se guarda con hash.
- Dada una contraseña actual incorrecta, cuando se intenta el cambio, entonces el sistema rechaza la solicitud con un error de autenticación.
- Dada una contraseña nueva que no cumple el largo mínimo, cuando se intenta el cambio, entonces el sistema rechaza la solicitud con un error de validación.
- Dado un usuario sin sesión, cuando intenta cambiar una contraseña, entonces el sistema responde con acceso no autorizado.
- El cambio de contraseña es opcional: ningún usuario está obligado a hacerlo.
- La contraseña nunca aparece en respuestas ni en registros (AC04).

### CA-U09 Cambiar el correo del Administrador (decisión del equipo)
- Dado un Administrador autenticado, cuando envía un correo válido que no está en uso y su contraseña actual, entonces su correo se actualiza y se usa para iniciar sesión.
- Dado un correo que ya existe, cuando se intenta el cambio, entonces el sistema rechaza la solicitud con un error de conflicto.
- Dado un Postulante, Docente o Encargado, cuando intenta cambiar su correo, entonces el sistema responde con acceso denegado.

### CA-U10 Listar usuarios (decisión del equipo)
- Dado un Administrador autenticado, cuando consulta la lista de usuarios (con filtro por rol), entonces ve nombre, DNI, correo, rol y estado, y nunca la contraseña ni su hash.
- Dado un Encargado autenticado, cuando consulta la lista, entonces solo ve usuarios con rol Postulante.
- Dado un Postulante o Docente, cuando intenta consultar la lista, entonces el sistema responde con acceso denegado.

### CA-U11 Desactivar y reactivar usuario (decisión del equipo)
- Dado un Administrador autenticado, cuando desactiva a un estudiante o docente, entonces el usuario queda inactivo, conserva sus datos y no puede iniciar sesión.
- Dado un usuario inactivo con un JWT aún vigente, cuando lo usa en una petición protegida, entonces el sistema responde con acceso no autorizado, porque comprueba que el usuario siga activo en cada petición.
- Dado un Administrador que intenta desactivarse a sí mismo o desactivar al último Administrador, cuando lo intenta, entonces el sistema rechaza la solicitud.
- Dado un usuario que no es Administrador, cuando intenta desactivar a alguien, entonces el sistema responde con acceso denegado.
- Dado un Administrador autenticado, cuando reactiva a un usuario inactivo, entonces el usuario vuelve a estar activo y puede iniciar sesión con sus credenciales actuales.
- Dado un usuario que no es Administrador, cuando intenta reactivar a alguien, entonces el sistema responde con acceso denegado.
- Los usuarios no se borran: se conservan para mantener el historial de exámenes y resultados.

### CA-U12 Crear cuentas de Administrador y Encargado (decisión del equipo)
- Dado un Administrador autenticado, cuando crea una cuenta de Administrador o de Encargado con nombre, correo y contraseña inicial, entonces se crea el usuario con ese rol y la contraseña se guarda con hash.
- Dado un correo que ya existe, cuando se intenta crear la cuenta, entonces el sistema rechaza la solicitud con un error de conflicto.
- Dado un Encargado, un Docente o un Postulante, cuando intenta crear una cuenta de Administrador o de Encargado, entonces el sistema responde con acceso denegado.
- Estas cuentas no usan la regla del DNI: quien las crea define el correo y una contraseña inicial segura.

### CA-U13 Registro masivo desde Excel (decisión del equipo)
- Dado un Administrador o Encargado autenticado, cuando sube un archivo .xlsx con las columnas Nombre y DNI, entonces el sistema lo acepta, responde de inmediato con un identificador de carga y procesa las filas en segundo plano.
- Dada una carga en proceso o terminada, cuando se consulta con su identificador, entonces muestra el estado, el total de filas, cuántas se crearon, cuántas ya existían y cuántas se rechazaron, con el número de fila y el motivo de cada rechazo.
- Dado un DNI que ya existe, cuando aparece en el archivo, entonces la fila se omite y se cuenta como ya existente, sin error y sin cambios en esa cuenta. Si la cuenta está desactivada, tampoco se reactiva.
- Dada una fila con DNI inválido, nombre vacío o DNI repetido dentro del archivo, cuando se procesa, entonces esa fila se rechaza con su número y motivo, sin impedir que se creen las demás.
- Dado un archivo que no es .xlsx, que supera el tamaño o el número máximo de filas, o que no tiene las columnas esperadas, cuando se sube, entonces el sistema lo rechaza sin crear ningún usuario.
- Dada una carga interrumpida, cuando se vuelve a subir el mismo archivo, entonces se crean solo las cuentas que faltan.
- Dado un usuario que no es Administrador ni Encargado, cuando intenta subir el archivo, entonces el sistema responde con acceso denegado.
- El resultado de una carga nunca incluye contraseñas ni hashes (AC04).
- Los límites de tamaño y de filas se configuran con variables de entorno (valores iniciales propuestos: 10 MB y 10,000 filas).

## Base de datos y caché
- PostgreSQL, tabla de usuarios: nombre, DNI (obligatorio y único para postulantes y docentes), correo único, hash de contraseña, rol y estado activo.
- PostgreSQL, tabla de cargas masivas: identificador, usuario que la subió, estado, total de filas, creadas, ya existentes, rechazadas, errores por fila y fechas.
- Las tablas se crean mediante migraciones SQL versionadas.
- Redis: no se usa en este módulo.

## Limitaciones conocidas
- La contraseña inicial de postulantes y docentes es su DNI, que no es un dato secreto. Es consecuencia de RF02, RF19 y RC09, y de que el cambio de contraseña es opcional.
- Cambiar la contraseña no cierra las sesiones ya abiertas: un JWT vigente sigue funcionando hasta que venza. Solo la desactivación del usuario se aplica de inmediato.
- No hay recuperación de contraseña olvidada.

## Pendiente de confirmar
- Si Encargado es un rol aparte, con los permisos descritos.
- Sede y carrera del postulante: según lo que anota el equipo, RF10 pide rankings por carrera y por sede, y ningún documento revisado define dónde se guardan. Si se guardan en este módulo, se agregan al registro individual y al Excel (columnas Sede y Carrera) y hay que decidir si cada Encargado trabaja solo con su sede. Debe salir del modelo de datos de `docs/`.
- Tiempo de vida del JWT (propuesta: 8 horas, configurable) y largo mínimo de la contraseña (propuesta: 8 caracteres).
- Si el nombre se guarda como un solo campo o separado en nombres y apellidos.
- Si el Administrador podrá restablecer la contraseña de un usuario que la olvidó (no incluido por ahora).
- Qué ocurre si en una carga masiva un DNI existente trae un nombre distinto (propuesta: no se cambia y se informa en el resultado).
- Reactivar usuarios (CA-U11) es una propuesta que falta confirmar.
