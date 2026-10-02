# Restricciones

| ID | Restricción | Descripción |
| --- | --- | --- |
| RC01 | Aplicación web | El sistema debe desarrollarse como una aplicación accesible mediante un navegador web actualizado, desde computadora o celular. |
| RC02 | Control de versiones | El código fuente y los documentos deben gestionarse con Git y mantenerse en un repositorio compartido en GitHub. |
| RC03 | API REST | La comunicación entre el frontend y los servicios del sistema debe realizarse mediante una API REST. |
| RC04 | Contenedores y orquestación | El sistema debe desplegarse en contenedores Docker orquestados con Kubernetes, para permitir el escalado automático. |
| RC05 | Caché en memoria | Las fichas activas y las respuestas temporales durante el examen deben almacenarse en Redis, para no saturar la base de datos. |
| RC06 | Procesamiento asíncrono | El cálculo de puntajes y del ranking debe realizarse en segundo plano mediante colas de mensajes (RabbitMQ). |
| RC07 | Base de datos relacional | La información definitiva debe almacenarse en PostgreSQL. |
| RC08 | Enfoque offline-first | El cliente debe guardar las respuestas localmente y sincronizarlas con el servidor, tolerando conexión a internet intermitente. |
| RC09 | Autenticación propia | El acceso debe realizarse con credenciales generadas por el sistema (usuario dni@sofia.edu y contraseña inicial igual al DNI), sin autoregistro del postulante. |
| RC10 | Examen único por simulacro | Todos los postulantes de un mismo simulacro deben recibir la misma versión y el mismo orden del examen. |
| RC11 | Sin integraciones externas | El sistema no se integra con la transmisión de clases virtuales de la academia (fuera de alcance). |