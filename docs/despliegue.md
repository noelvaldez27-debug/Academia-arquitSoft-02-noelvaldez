# Despliegue local con Docker Compose

> **Estado de verificación:** Procedimiento verificado de manera práctica en la tarea 11 del proyecto. Se ejecutó `docker compose up -d --build`, confirmando el inicio correcto de los 4 servicios (`postgres`, `redis`, `rabbitmq` en estado *healthy*, y `backend` en estado *Up*), así como la respuesta HTTP 200 en `/health` y `/api-docs/`, la ejecución del contenedor backend con el usuario `node` y los permisos de escritura sobre el volumen `/app/uploads`.

Guía paso a paso para levantar y ejecutar el entorno de desarrollo local de EVALUA-NET en la computadora del desarrollador utilizando Docker Compose.

---

## 1. Requisitos previos

Antes de comenzar, asegúrate de tener instalado en tu computadora:

- **Docker Desktop**: Debe estar instalado y en ejecución (el motor de Docker debe estar activo).
- **Git**: Para clonar el repositorio y gestionar versiones de código.
- **Node.js 20 o superior** (opcional): Solo es necesario si vas a ejecutar las pruebas o compilar el código directamente en tu sistema operativo fuera de Docker.

---

## 2. Cómo obtener el proyecto

Clona el repositorio desde GitHub y navega al directorio del proyecto:

```bash
git clone https://github.com/noelvaldez27-debug/Academia-arquitSoft-02-noelvaldez.git
cd Academia-arquitSoft-02-noelvaldez
```

---

## 3. Configuración de variables de entorno

El proyecto arranca aunque no exista un archivo `.env`, porque el compose trae valores de respaldo de ejemplo. Aun así conviene crear uno propio, para no usar las contraseñas de ejemplo.

### Crear el archivo `.env` en Windows (PowerShell)

Ejecuta el siguiente comando en la consola de PowerShell:

```powershell
Copy-Item -Path .env.example -Destination .env
```

### Modificar las contraseñas de ejemplo

Abre el archivo `.env` recién creado con tu editor de texto y cambia las contraseñas y claves de prueba por valores seguros propios para tu entorno local:

- `POSTGRES_PASSWORD`: Contraseña para el usuario de PostgreSQL (definido en  `POSTGRES_USER`).
- `REDIS_PASSWORD`: Contraseña para la autenticación en Redis.
- `RABBITMQ_PASSWORD`: Contraseña para el usuario de RabbitMQ (definido en  `RABBITMQ_USER`).
- `JWT_SECRET`: Clave secreta utilizada para firmar los tokens de autenticación JWT.

> **Advertencia de seguridad obligatoria:**
> - El archivo `.env` contiene credenciales locales y **nunca debe subirse al repositorio Git** (está registrado en `.gitignore`).
> - Los valores que vienen en `.env.example` son solo de ejemplo demostrativo y deben cambiarse antes del primer uso.

---

## 4. Levantar los servicios con Docker Compose

Para compilar la imagen del backend y levantar todos los contenedores juntos, ejecuta:

```bash
docker compose up --build
```

Si prefieres levantarlos en segundo plano (modo desatendido), usa:

```bash
docker compose up -d --build
```

Docker Compose descargará las imágenes oficiales e iniciará en orden los siguientes 4 servicios:

1. `postgres` (`postgres:16-alpine`): Base de datos relacional principal.
2. `redis` (`redis:7-alpine`): Almacenamiento en memoria para caché y respuestas temporales.
3. `rabbitmq` (`rabbitmq:3.13-management-alpine`): Broker de mensajería asíncrona.
4. `backend` (construido desde el `Dockerfile` con Node.js 20): Servidor API REST Express, que esperará a que los tres servicios anteriores estén saludables antes de iniciar.

---

## 5. Comprobar que el sistema funciona

### Recorrido de Analítica del Estudiante

Usa el archivo de entorno local con credenciales sintéticas del administrador general. El recorrido crea datos de prueba en el proyecto Compose aislado y comprueba las rutas de temas, los resultados definitivos, RF12 y la reutilización concurrente de recomendaciones RF13.

```powershell
$env:ANALITICA_IA = 'simulada'
docker compose -p evalua-analitica up -d --build --wait
docker compose -p evalua-analitica exec -T backend node dist/scripts/seed-admin.js
$recorrido = Get-Content -Encoding utf8 -Raw pruebas/verificar-analitica-compose.cjs
$recorrido | docker compose -p evalua-analitica exec -T backend node -
$env:ANALITICA_IA = 'local'
docker compose -p evalua-analitica up -d --no-deps --wait backend
$recorrido | docker compose -p evalua-analitica exec -T backend node -
```

En el primer recorrido, `origen: ia` corresponde al proveedor simulado. En el segundo, `origen: local` corresponde a las plantillas deterministas. Ambos recorridos usan los workers normales de Rendición y Resultados con datos sintéticos.

Una vez levantados los contenedores, verifica su funcionamiento abriendo tu navegador web o usando un cliente HTTP en las siguientes direcciones:

- **Verificación de salud del backend:**
  [http://localhost:3000/health](http://localhost:3000/health)
  Debe responder con estado HTTP 200 y un JSON indicando el estado del servicio:
  ```json
  {"status":"ok","timestamp":"..."}
  ```
  > **Limitación importante:** El endpoint `/health` actual solo confirma que el servidor HTTP Express levantó y está respondiendo solicitudes. No realiza consultas activas ni verifica la conectividad interna con PostgreSQL, Redis ni RabbitMQ (dicha verificación de infraestructura la gestionan individualmente los *healthchecks* de Docker Compose mediante `depends_on`).

- **Documentación Swagger / OpenAPI:**
  [http://localhost:3000/api-docs/](http://localhost:3000/api-docs/)
  Muestra la interfaz interactiva con todos los endpoints disponibles del backend (en clientes HTTP programáticos o scripts, asegúrate de incluir la barra final `/api-docs/` para acceder directamente a la documentación sin redirecciones).

- **Consola de administración de RabbitMQ:**
  [http://localhost:15672](http://localhost:15672)
  Panel visual de RabbitMQ (inicia sesión con el usuario `RABBITMQ_USER` y contraseña `RABBITMQ_PASSWORD` definidos en tu archivo `.env`).

---

## 6. Ver los registros (logs) de los servicios

Para observar la salida de texto y posibles mensajes de error en tiempo real:

- Ver los registros de **todos** los servicios:
  ```bash
  docker compose logs -f
  ```

- Ver los registros únicamente del **backend**:
  ```bash
  docker compose logs -f backend
  ```

- Ver los registros de un servicio de infraestructura específico:
  ```bash
  docker compose logs -f postgres
  docker compose logs -f redis
  docker compose logs -f rabbitmq
  ```

---

## 7. Ejecución de migraciones de base de datos

Las migraciones de PostgreSQL se gestionan mediante scripts SQL versionados en la carpeta `migraciones/` (ADR-015), sin ORM ni librerías adicionales.

### Ejecutar migraciones dentro de Docker Compose
Una vez levantado el backend con `docker compose up -d`, ejecuta el script de migración con Node.js en el contenedor:

```bash
docker compose exec backend node dist/scripts/migrar.js
```

### Ejecutar migraciones localmente (desarrollo fuera de Docker)
Configura las variables de conexión a PostgreSQL (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) en tu entorno o archivo `.env` y ejecuta:

```bash
npm run migrar
```


Para salir de la vista de registros presiona `Ctrl + C`.

---

## 7. Detener los servicios sin borrar datos

Cuando termines tu sesión de trabajo, detén los contenedores de forma segura con:

```bash
docker compose down
```

Este comando apaga y remueve los contenedores y la red virtual, pero **conserva intactos los datos** de la base de datos PostgreSQL, Redis y RabbitMQ en los volúmenes locales de Docker (`postgres_data`, `redis_data`, `rabbitmq_data`).

> **Advertencia crítica sobre volúmenes:**
> **No utilices** el comando `docker compose down -v` salvo que desees intencionalmente borrar toda la base de datos y comenzar desde cero absoluto, ya que el parámetro `-v` elimina de forma irreversible todos los volúmenes y sus datos asociados.

---

## 8. Ejecución de pruebas fuera de Docker

Si deseas ejecutar las pruebas unitarias y de integración en tu computadora sin necesidad de levantar contenedores Docker, necesitas tener instalado Node.js 20:

1. Instalar las dependencias exactas del proyecto:
   ```bash
   npm ci
   ```

2. Ejecutar la suite de pruebas automatizadas con Jest:
   ```bash
   npm test
   ```

3. Ejecutar las pruebas y generar el reporte detallado de cobertura de código:
   ```bash
   npm run test:cov
   ```

---

## 9. Problemas frecuentes y soluciones

- **Docker Desktop no está en ejecución:**
  Si recibes el error `error during connect: ... open //./pipe/docker_engine: The system cannot find the file specified`, abre la aplicación Docker Desktop y espera a que indique que el motor está activo.

- **Inconsistencia al modificar `PORT` en `.env` (puerto interno vs externo):**
  Actualmente, `docker-compose.yml` mapea `${PORT:-3000}:3000`. Si se cambia `PORT` en `.env` a un valor distinto (por ejemplo `PORT=3001`), el servidor Express dentro del contenedor escuchará en el puerto 3001, pero Docker seguirá redirigiendo el tráfico del host al puerto 3000 interno del contenedor, provocando que el contenedor deje de responder en el host. Por ello, en el entorno Docker Compose actual se debe mantener `PORT=3000` en `.env`.

- **Conflicto de puertos en el host (puerto 3000 o 15672 en uso):**
  Si otra aplicación en tu computadora está ocupando el puerto 3000 o 15672, detén la aplicación en conflicto antes de iniciar los contenedores. No modifiques la variable `PORT` en `.env` sin ajustar la configuración del compose.

- **No existe el archivo `.env`:**
  El compose usa valores de respaldo de ejemplo y arranca igual. Para usar tus propias contraseñas, crea el archivo con `Copy-Item -Path .env.example -Destination .env` en la raíz del proyecto.

- **El backend tarda en arrancar:**
  El servicio `backend` depende de que `postgres`, `redis` y `rabbitmq` pasen sus pruebas de salud (`condition: service_healthy`). Es normal que tarde entre 15 y 30 segundos en iniciar en el primer arranque mientras se inicializan los tres motores.

---

## 10. Despliegue en la nube (AWS)

El despliegue en la nube mediante AWS corresponde a la planificación del Sprint 3 y se encuentra actualmente pendiente de ejecución. Las instrucciones contenidas en este documento aplican exclusivamente al entorno de desarrollo local.

## 11. Verificación local de Banco de Preguntas

El servicio `worker-separatas` comparte el volumen de originales con el backend.
Usa `SEPARATAS_IA_PROVEEDOR=simulado` en pruebas. Activar Gemini requiere
autorización específica de operación, un modelo y una clave en variables de
entorno. El administrador general registra aparte la autorización de cada
separata y el alcance de la transferencia.

Ejecutar la integración con una base nueva y datos sintéticos. El script aplica
las migraciones y crea las cuentas de prueba dentro del contenedor.

```powershell
$env:SEPARATAS_IA_PROVEEDOR = 'simulado'
docker compose -p evalua-banco up -d --build --wait
Get-Content pruebas/verificar-banco-compose.cjs -Raw | docker compose -p evalua-banco exec -T backend node
```

## Validación de Rendición de Examen

El servicio `migraciones` de Docker Compose aplica los SQL pendientes antes de arrancar la API y el worker de separatas. Para ejecutar el recorrido reproducible, usa un proyecto Compose de pruebas con PostgreSQL, Redis y RabbitMQ. Configura las tres variables `ADMIN_GENERAL_*` con valores de prueba y el proveedor de IA simulado.

```powershell
docker compose up -d --build --wait
docker compose exec -T backend node dist/scripts/seed-admin.js
Get-Content -Raw pruebas/verificar-rendicion-compose.cjs | docker compose exec -T backend node -
npm.cmd run test:cov -- --runInBand
```

El recorrido crea datos sintéticos y comprueba JWT, aislamiento, orden y claves congeladas, reconexión, conflictos de revisión, cierres concurrentes, vencimiento, Swagger y entrega de eventos. Para comprobar la bandeja de salida durante una interrupción, detén la aplicación RabbitMQ dentro del proyecto aislado con `rabbitmqctl stop_app`, ejecuta el mismo recorrido pasando `-e RENDICION_BROKER_CAIDO=1` a `docker compose exec`, y restablece el broker con `rabbitmqctl start_app`. La API debe conservar los cierres y el publicador debe recuperarlos al volver el broker.

## Validación de Procesamiento de Resultados

Compose inicia `worker-resultados` después de aplicar las migraciones. El worker consume `examen.finalizado` con confirmación manual y publica reintentos persistentes antes de confirmar la entrega anterior. Tras tres reintentos o ante un evento inválido, conserva el mensaje en `examen.finalizado.fallos` para revisión y eventual republicación del evento corregido, sin el encabezado de intento. Una desconexión del consumidor deja los mensajes no confirmados disponibles para nueva entrega.

En un proyecto Compose de pruebas con las variables `ADMIN_GENERAL_*` configuradas, ejecuta:

```powershell
docker compose up -d --build --wait
docker compose exec -T backend node dist/scripts/seed-admin.js
$recorrido = Get-Content -Raw pruebas/verificar-resultados-compose.cjs
$recorrido | docker compose exec -T backend node -
$recorrido | docker compose exec -T -e RESULTADOS_FASE=duplicados backend node -
docker compose exec -T rabbitmq rabbitmqctl stop_app
try {
  $recorrido | docker compose exec -T -e RESULTADOS_FASE=caido backend node -
} finally {
  docker compose exec -T rabbitmq rabbitmqctl start_app
}
$recorrido | docker compose exec -T -e RESULTADOS_FASE=recuperado backend node -
npm.cmd run test:cov -- --runInBand
```

El primer recorrido mide desde el cierre hasta la primera lectura exitosa por sondeo. Los recorridos siguientes verifican que eventos repetidos no creen otra nota y que una interrupción del broker permita consultar el estado pendiente y recuperar la calificación al volver el servicio. Para repetir el recorrido histórico de Rendición que lee directamente de la cola de cierre, detén temporalmente `worker-resultados` en su proyecto de pruebas aislado.

## Validación de Ranking y Reportes

En un proyecto Compose de pruebas con credenciales administrativas sintéticas e IA simulada, ejecuta el recorrido desde el contenedor backend. Para aislar el proyecto cuando los puertos del host ya estén en uso, puedes usar un override de Compose con `ports: !reset []` en los servicios `backend` y `rabbitmq`.

```powershell
$proyecto = 'evalua-ranking-validacion'
docker compose -p $proyecto up -d --build --wait
docker exec "$proyecto-backend-1" node dist/scripts/seed-admin.js
$recorrido = Get-Content -Encoding utf8 -Raw pruebas/verificar-ranking-compose.cjs
$recorrido | docker exec -i "$proyecto-backend-1" node -
$recorrido | docker exec -i -e RANKING_FASE=compatibilidad "$proyecto-backend-1" node -
docker exec "$proyecto-rabbitmq-1" rabbitmqctl stop_app
try {
  $recorrido | docker exec -i -e RANKING_FASE=caido "$proyecto-backend-1" node -
} finally {
  docker exec "$proyecto-rabbitmq-1" rabbitmqctl start_app
}
$recorrido | docker exec -i -e RANKING_FASE=recuperado "$proyecto-backend-1" node -
```

El recorrido normal verifica el cierre concurrente, la clasificación, los permisos docentes y la exportación. La fase de compatibilidad aplica las migraciones en un esquema sintético dentro de una transacción que revierte al finalizar. Las fases de caída y recuperación comprueban que el ranking espere la calificación pendiente.

### Credenciales provisionales y archivado

Las migraciones 018 y 019 agregan vigencia de credenciales, entregas restringidas y auditoría administrativa. Las nuevas cuentas creadas por API o importación normal reciben una credencial provisional de 24 horas. Usuarios guarda el hash de la contraseña y, para la entrega, una referencia aleatoria diferente por cuenta. La contraseña se deriva mediante HMAC con separación de propósito a partir del secreto de despliegue y la referencia. El servidor arma el Excel en memoria, dentro de la transacción que consume la referencia. La rotación del secreto de despliegue deja inválidas las entregas pendientes generadas con el secreto anterior.

El administrador responsable consume una entrega individual con `POST /api/usuarios/estudiantes/{id}/credenciales` o la del lote terminado con `POST /api/usuarios/cargas-masivas/{id}/credenciales`. El token provisional solo habilita `PATCH /api/usuarios/password`. Después se requiere un nuevo inicio de sesión. La versión de sesión bloquea tokens anteriores.

El archivado individual reutiliza la ruta de desactivación para postulantes. `POST /api/usuarios/estudiantes/archivar` archiva un lote de manera atómica y `GET /api/usuarios?archivados=true` muestra postulantes archivados dentro del alcance autorizado. El inicio de Rendición toma un bloqueo compartido sobre la cuenta y el archivado un bloqueo exclusivo antes de consultar intentos activos mediante el contrato público de Rendición. El archivado espera a que los intentos estén cerrados y permanece independiente del consumo de calificaciones pendientes.

Para verificar en un proyecto Compose aislado, con datos sintéticos e IA simulada, cargar el administrador de prueba y ejecutar:

```powershell
$recorrido = Get-Content -Raw -Encoding UTF8 pruebas/verificar-credenciales-compose.cjs
$recorrido | docker compose exec -T -e VERIFICAR_ARCHIVO=si backend node -
```

Los recorridos antiguos que iniciaban sesión con el DNI en altas nuevas deben obtener la entrega provisional y cambiar la contraseña antes de usar las rutas académicas. Sus resultados históricos se conservan vinculados al código anterior.
