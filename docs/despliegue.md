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
