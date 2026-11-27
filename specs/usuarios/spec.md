# Especificación — Módulo Gestión de Usuarios

> Historias: HU01, HU02, HU14 a HU22 | Requisitos: RF01, RF02, RF19 a RF26 | Restricciones: RC09, RC15, RC16 | Atributos: AC04, AC05 | Decisiones: ADR-007, ADR-008, ADR-015, ADR-016
> Las tareas técnicas de este módulo están en `specs/usuarios/tasks.md`.
> Cuando este documento fija un valor que `docs/` no define (duraciones, largos, límites), es una propuesta del equipo y figura en «Pendiente de confirmar».

## Alcance
El módulo registra usuarios (postulantes, docentes y administradores), genera sus credenciales, autentica con JWT y controla el acceso por rol y por sede. No hay autoregistro de ningún usuario (RC09). Los postulantes se registran de uno en uno o con una carga masiva desde Excel; los docentes los registra el administrador general. Cada postulante pertenece a una sede y a una carrera, y cada sede tiene sus propios estudiantes.

## Roles
- **Postulante.**
- **Docente.**
- **Administrador general:** uno solo, con alcance sobre todas las sedes. Registra docentes, crea las cuentas de administrador de sede, registra estudiantes de cualquier sede (de uno en uno o con Excel), lista usuarios, desactiva y reactiva usuarios, crea sedes, y cambia su propio correo y contraseña.
- **Administrador de sede:** varios por sede, con alcance solo sobre su sede. Registra estudiantes de su sede (de uno en uno o con Excel), lista los estudiantes de su sede, desactiva y reactiva estudiantes de su sede, y cambia su propio correo y contraseña. No ve ni modifica a nadie de otra sede, ni registra docentes, ni crea cuentas de administrador.

## Datos del usuario
- Postulantes: nombre, DNI (8 dígitos numéricos), sede y carrera. El correo y la contraseña inicial se generan a partir del DNI.
- Docentes: nombre y DNI. El correo y la contraseña inicial se generan a partir del DNI. No pertenecen a una sede.
- Administradores: nombre, correo y contraseña inicial definidos por quien crea la cuenta. El administrador de sede tiene además una sede; el administrador general no tiene sede.
- Carrera: texto que el sistema normaliza (sin espacios sobrantes y en mayúsculas), para que «Medicina» y «medicina» sean la misma carrera.
- Sede: Hana, Urin y Central, guardadas en una tabla y no escritas en el código.

## Criterios de aceptación
Formato: Dado / Cuando / Entonces.

### CA-U01 Registrar estudiante (HU01, RF01, RF22)
- Dado un administrador general autenticado, cuando registra un estudiante con nombre, DNI, sede y carrera válidos, entonces se crea un usuario con rol Postulante en esa sede.
- Dado un administrador de sede autenticado, cuando registra un estudiante de su sede, entonces se crea el usuario; y si indica otra sede, entonces el sistema responde con acceso denegado.
- Dado un DNI que ya existe, cuando se intenta registrar de nuevo, entonces el sistema rechaza el registro con un error de conflicto, sin revelar a qué sede pertenece.
- Dado un DNI que no tiene 8 dígitos numéricos, un nombre vacío, una carrera vacía o una sede que no existe, cuando se intenta registrar, entonces el sistema rechaza la solicitud con un error de validación.
- Dado un Postulante o un Docente, cuando intenta registrar un estudiante, entonces el sistema responde con acceso denegado.
- Dado un usuario sin sesión, cuando intenta registrar un estudiante, entonces el sistema responde con acceso no autorizado.

### CA-U02 Generación automática de credenciales (HU02, RF02)
- Dado un estudiante o docente recién registrado, cuando se crea su cuenta, entonces su usuario es `dni@sofia.edu` y su contraseña inicial es su DNI.
- Dada una cuenta creada, cuando se consulta la base de datos, entonces la contraseña está guardada con hash y nunca en texto plano (AC04).
- Dada cualquier respuesta de la API o registro de logs, entonces no contiene la contraseña ni su hash.

### CA-U03 Registrar docente (HU14, RF19)
- Dado un administrador general autenticado, cuando registra un docente con nombre y DNI válidos, entonces se crea un usuario con rol Docente y credenciales generadas con la misma regla que los postulantes.
- Dado un administrador de sede, un Docente o un Postulante, cuando intenta registrar un docente, entonces el sistema responde con acceso denegado.
- Dado un DNI ya registrado, cuando se intenta registrar un docente con ese DNI, entonces el sistema rechaza el registro con un error de conflicto.

### CA-U04 Administrador general inicial (RF25)
- Dado un sistema recién desplegado sin usuarios, cuando se ejecuta el script de arranque, entonces se crea el administrador general con el nombre, el correo y la contraseña tomados de variables de entorno, y sin sede.
- Dado un sistema que ya tiene un administrador general, cuando se vuelve a ejecutar el script, entonces no crea otro, aunque el existente haya cambiado su correo.
- Si falta alguna de las variables, el script falla con un mensaje claro y no usa valores de respaldo.
- Los datos del administrador general no deben estar escritos en el código ni en el repositorio.
- Esta cuenta es una excepción a la regla del DNI de RC09.
- Ningún endpoint permite crear un segundo administrador general.

### CA-U05 Iniciar sesión (HU20, RF20, ADR-007)
- Dadas credenciales correctas de un usuario activo, cuando inicia sesión, entonces recibe un JWT que incluye su identificador, su rol y su sede, con una duración configurable.
- Dadas credenciales incorrectas, o las de un usuario desactivado, cuando intenta iniciar sesión, entonces recibe un error de autenticación que no revela si falló el usuario o la contraseña, ni si la cuenta está desactivada.
- Dado un JWT vencido o alterado, cuando se usa en una petición protegida, entonces el sistema responde con acceso no autorizado.

### CA-U06 Control de acceso por rol y por sede (AC04, RC15)
- Dado un endpoint restringido a un rol, cuando lo invoca un usuario con otro rol, entonces el sistema responde con acceso denegado.
- Dado un endpoint protegido, cuando se invoca sin JWT, entonces el sistema responde con acceso no autorizado.
- Dado un administrador de sede, cuando intenta ver, registrar, cargar o desactivar a un estudiante de otra sede, entonces el sistema responde con acceso denegado.
- El rol y la sede que cuentan son los que figuran en la base de datos en ese momento, no los que traía el JWT.

### CA-U07 API pública del módulo
- Los otros módulos solo acceden a datos de usuarios mediante los puertos expuestos en `index.ts`, nunca a la tabla ni al repositorio directamente.
- Esos puertos permiten autenticar y autorizar por rol y sede, y consultar un usuario por su identificador con su sede y su carrera, sin contraseñas ni hashes.
- Todos los endpoints del módulo están documentados en OpenAPI/Swagger (ADR-008).

### CA-U08 Cambiar la propia contraseña (HU21, RF26)
- Dado un usuario autenticado de cualquier rol, cuando envía su contraseña actual correcta y una contraseña nueva válida, entonces la contraseña se actualiza y se guarda con hash.
- Dada una contraseña actual incorrecta, cuando se intenta el cambio, entonces el sistema rechaza la solicitud con un error de autenticación.
- Dada una contraseña nueva que no cumple el largo mínimo, cuando se intenta el cambio, entonces el sistema rechaza la solicitud con un error de validación.
- Dado un usuario sin sesión, cuando intenta cambiar una contraseña, entonces el sistema responde con acceso no autorizado.
- El cambio de contraseña es opcional: ningún usuario está obligado a hacerlo.
- La contraseña nunca aparece en respuestas ni en registros (AC04).

### CA-U09 Cambiar el correo del administrador (HU22, RF26)
- Dado un administrador autenticado, general o de sede, cuando envía un correo válido que no está en uso y su contraseña actual, entonces su correo se actualiza y se usa para iniciar sesión.
- Dado un correo que ya existe, cuando se intenta el cambio, entonces el sistema rechaza la solicitud con un error de conflicto.
- Dado un Postulante o un Docente, cuando intenta cambiar su correo, entonces el sistema responde con acceso denegado.

### CA-U10 Listar usuarios (HU17, RF23)
- Dado un administrador general autenticado, cuando consulta la lista de usuarios con filtro por rol o por sede, entonces ve nombre, DNI, correo, rol, sede, carrera y estado, y nunca la contraseña ni su hash.
- Dado un administrador de sede autenticado, cuando consulta la lista, entonces solo ve los postulantes de su sede.
- Dado un Postulante o un Docente, cuando intenta consultar la lista, entonces el sistema responde con acceso denegado.

### CA-U11 Desactivar y reactivar usuario (HU18, HU16, RF24, RC16)
- Dado un administrador general autenticado, cuando desactiva a un usuario, entonces el usuario queda inactivo, conserva sus datos y no puede iniciar sesión.
- Dado un administrador de sede autenticado, cuando desactiva o reactiva a un postulante de su sede, entonces se aplica el cambio; y si el postulante es de otra sede o es otro tipo de usuario, entonces el sistema responde con acceso denegado.
- Dado un usuario inactivo con un JWT aún vigente, cuando lo usa en una petición protegida, entonces el sistema responde con acceso no autorizado, porque comprueba que el usuario siga activo en cada petición.
- Dado un administrador que intenta desactivarse a sí mismo, o desactivar al administrador general, cuando lo intenta, entonces el sistema rechaza la solicitud.
- Dado un administrador autorizado, cuando reactiva a un usuario inactivo, entonces vuelve a estar activo y puede iniciar sesión con sus credenciales actuales.
- Dado un Postulante o un Docente, cuando intenta desactivar o reactivar a alguien, entonces el sistema responde con acceso denegado.
- Los usuarios no se borran: se conservan para mantener el historial de exámenes y resultados.

### CA-U12 Crear administradores de sede (HU19, RF25)
- Dado un administrador general autenticado, cuando crea una cuenta de administrador de sede con nombre, correo, contraseña inicial y una sede existente, entonces se crea el usuario con ese rol y esa sede, y la contraseña se guarda con hash.
- Dado un correo que ya existe, cuando se intenta crear la cuenta, entonces el sistema rechaza la solicitud con un error de conflicto.
- Dado un administrador de sede, un Docente o un Postulante, cuando intenta crear una cuenta de administrador, entonces el sistema responde con acceso denegado.
- Estas cuentas no usan la regla del DNI: quien las crea define el correo y una contraseña inicial segura.
- No se puede crear una cuenta de administrador general.

### CA-U13 Registro masivo desde Excel (HU15, RF21, ADR-016)
- Dado un administrador autenticado, cuando sube un archivo .xlsx con las columnas Nombre, DNI, Sede y Carrera, entonces el sistema lo acepta, responde de inmediato con un identificador de carga y procesa las filas en segundo plano.
- Dada una carga en proceso o terminada, cuando se consulta con su identificador, entonces muestra el estado, el total de filas, cuántas se crearon, cuántas ya existían y cuántas se rechazaron, con el número de fila y el motivo de cada rechazo. Un administrador de sede solo ve las cargas de su sede.
- Dado un DNI que ya existe, cuando aparece en el archivo, entonces la fila se omite y se cuenta como ya existente, sin error y sin cambios en esa cuenta, y sin revelar a qué sede pertenece. Si la cuenta está desactivada, tampoco se reactiva. Si el nombre difiere, se añade un aviso con el número de fila sin revelar datos de la cuenta registrada.
- Dada una fila con DNI inválido, nombre o carrera vacíos, sede inexistente o DNI repetido dentro del archivo, cuando se procesa, entonces esa fila se rechaza con su número y motivo, sin impedir que se creen las demás.
- Dado un administrador de sede, cuando su archivo trae una fila de otra sede, entonces esa fila se rechaza con su motivo.
- Dado un archivo que no es .xlsx, que supera el tamaño o el número máximo de filas, o que no tiene las columnas esperadas, cuando se sube, entonces el sistema lo rechaza sin crear ningún usuario.
- Dada una carga interrumpida, cuando se vuelve a subir el mismo archivo, entonces se crean solo las cuentas que faltan.
- Dado un Postulante o un Docente, cuando intenta subir el archivo, entonces el sistema responde con acceso denegado.
- El resultado de una carga nunca incluye contraseñas ni hashes (AC04).
- Los límites de tamaño y de filas se configuran con variables de entorno (valores iniciales propuestos: 10 MB y 10,000 filas).

### CA-U14 Sedes (RF22, AC05)
- Dado cualquier administrador autenticado, cuando consulta las sedes, entonces ve la lista de sedes existentes.
- Dado un administrador general autenticado, cuando crea una sede nueva con un nombre que no existe, entonces la sede queda disponible para registrar estudiantes, sin cambiar código.
- Dado un nombre de sede que ya existe, cuando se intenta crear, entonces el sistema rechaza la solicitud con un error de conflicto.
- Dado un administrador de sede, un Docente o un Postulante, cuando intenta crear una sede, entonces el sistema responde con acceso denegado.

## Base de datos y caché
- PostgreSQL, tabla de sedes: identificador y nombre único. Se siembra con Hana, Urin y Central.
- PostgreSQL, tabla de usuarios: nombre, DNI (obligatorio y único para postulantes y docentes), correo único, hash de contraseña, rol, estado activo, sede (obligatoria para postulantes y administradores de sede) y carrera (para postulantes). Un índice único parcial garantiza un solo administrador general.
- PostgreSQL, tabla de cargas masivas: identificador, usuario y sede que la subió, estado, total de filas, creadas, ya existentes, rechazadas, errores por fila y fechas.
- Las tablas se crean mediante migraciones SQL versionadas (ADR-015).
- Redis: no se usa en este módulo.

## Limitaciones conocidas
- El registro individual y la carga masiva se rigen por los requisitos documentados, que no establecen un tope de estudiantes por sede.
- La contraseña inicial de postulantes y docentes es su DNI, que no es un dato secreto. Es consecuencia de RF02, RF19 y RC09, y de que el cambio de contraseña es opcional.
- Cambiar la contraseña no cierra las sesiones ya abiertas: un JWT vigente sigue funcionando hasta que venza. Solo la desactivación del usuario se aplica de inmediato.
- No hay recuperación de contraseña olvidada.
- Comprobar en cada petición que el usuario siga activo implica una consulta a PostgreSQL por petición. Si afecta a las pruebas de carga, se puede guardar ese dato en Redis por un tiempo corto.

## Pendiente de confirmar
- Carrera como texto normalizado (lo asumido) o como lista cerrada de carreras mantenida por el administrador general.
- Si los docentes pertenecen a una sede (hoy no).
- Si el administrador de sede puede desactivar y reactivar postulantes de su sede (hoy sí).
- Si el nombre se guarda como un solo campo o separado en nombres y apellidos.
- Tiempo de vida del JWT (propuesta: 8 horas, configurable) y largo mínimo de la contraseña (propuesta: 8 caracteres).
- Si el administrador podrá restablecer la contraseña de un usuario que la olvidó (no incluido por ahora).

## Ampliación aprobada para ciclos

CA-U13 distingue importación normal (omite todo DNI existente) y nuevo ciclo explícito (omite activos y puede recuperar archivados autorizados). Ambas modalidades conservan la validación por fila y sede. CA-U02 y CA-U08 adoptan emisión provisional aleatoria, expiración y cambio obligatorio para postulantes que reciben nueva credencial. CA-U11 requiere invalidación permanente de JWT anteriores al archivado. La entrega masiva se reserva al administrador responsable mediante Excel temporal de un solo uso. Los criterios detallados CA-VS01–04 se encuentran en la [SDD de validación](../validacion-sprint-2/spec.md).

## Ampliación aprobada: tolerancia de formato para Excel

La carga masiva reconoce estos encabezados equivalentes, con independencia de mayúsculas, tildes y espacios repetidos: Nombre (`NOMBRE`, `NOMBRES`, `NOMBRE COMPLETO`, `NOMBRES COMPLETOS`, `APELLIDOS Y NOMBRES`); DNI (`DNI`, `D.N.I.`, `DOCUMENTO DE IDENTIDAD`); Carrera (`CARRERA`, `CARRERA PROFESIONAL`); Sede (`SEDE`, `CEDE`). Se conservan encabezados opcionales existentes. La fila de encabezados se busca entre las primeras 20 filas; filas vacías, columnas numeradas/sin encabezado y columnas adicionales se ignoran. Si dos columnas representan un mismo campo reconocido, se informa la ambigüedad y se rechaza el archivo.

El DNI se acepta como texto o número únicamente si representa exactamente ocho dígitos; nunca se completan ceros ni se inventan dígitos. Los nombres personales no se corrigen automáticamente. Se recortan y compactan espacios en valores; la sede se consulta en el catálogo existente sin distinguir mayúsculas/minúsculas. El administrador general requiere columna Sede. El administrador de sede puede omitirla y se asigna exclusivamente su sede autenticada; si especifica otra, se rechaza la fila. Se conservan permisos, duplicados, ciclos, límites y procesamiento asíncrono.

Ante errores HTTP de validación al subir Excel, la interfaz puede presentar el mensaje seguro de validación enviado por el servidor. No se muestran detalles internos, secretos, credenciales ni trazas, y no cambia el manejo de errores de otras funciones REST.
