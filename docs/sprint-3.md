# Sprint 3: Integración y despliegue

Fuente: enunciado del docente (curso IS-488 Arquitectura de Software).

En este sprint, el estudiante realizará la integración y el despliegue de su proyecto en un entorno accesible, verificando el funcionamiento de la solución y la correcta comunicación entre sus componentes.

## Entregables

1. **Proyecto integrado y desplegado:** software funcional y accesible mediante una URL pública o un mecanismo de instalación y ejecución, según el tipo de aplicación.
2. **Plataforma de despliegue:** indicar el proveedor y servicio utilizado (AWS, Azure, Google Cloud, Render, Railway, Vercel, entre otros), así como los componentes desplegados.
3. **Documentación técnica actualizada:** arquitectura implementada, diagramas C4, configuración y procedimiento de integración y despliegue.
4. **Repositorio Git actualizado:** código fuente, documentación, archivos de configuración y scripts necesarios para reproducir la solución.

## Presentación (máximo 5 minutos)

El estudiante deberá realizar una demostración breve que incluya:

- **Proyecto en funcionamiento:** mostrar el software desplegado o instalado.
- **Despliegue:** indicar dónde se encuentra alojado y qué plataforma utilizó.
- **Integración:** demostrar un flujo funcional y la comunicación entre sus principales componentes.
- **Evidencias:** mostrar brevemente el repositorio Git.
- **Recordar compartir el repositorio al docente**, en caso de tener acceso privado, compartirlo con el correo: Lizbeth.jaico@unsch.edu.pe

## Importante

El proyecto debe encontrarse desplegado y operativo al momento de la presentación. No será suficiente presentar únicamente capturas de pantalla, diagramas o código fuente.

## Notas del proyecto (no forman parte del enunciado)

- La docente confirmó que la demo debe mostrar una interfaz de usuario, no solo la API con Swagger. Por eso se construye la aplicación web (React + Tailwind, carpeta `frontend/`, ver ADR-014).
- Plataforma de despliegue: AWS, con una instancia EC2 y docker-compose, y Amazon S3 para las separatas (ver ADR-013 y ADR-012).
- Los diagramas C4 (`docs/04-modelo-c4/`) deben actualizarse al inicio de este sprint: contenedores con la aplicación web, el despliegue en AWS y Gemini como sistema externo; componentes con `ServicioIA` y `AlmacenArchivos`.
- Debe existir `docs/despliegue.md` con el procedimiento paso a paso, y el repositorio debe arrancar con `docker compose up` y variables de entorno documentadas en `.env.example`.
- El flujo de la demo debe cruzar los componentes: la aplicación web llama a la API, esta guarda en Redis, publica en RabbitMQ, el worker procesa y escribe en PostgreSQL, y el postulante ve su resultado.
- Antes de la presentación, verificar que la instancia esté encendida y activar alertas de presupuesto en AWS.