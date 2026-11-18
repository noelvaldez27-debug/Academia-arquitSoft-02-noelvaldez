# Restricciones

| ID | Restricción | Descripción |
| --- | --- | --- |
| RC01 | Aplicación web | El sistema debe desarrollarse como una aplicación accesible mediante un navegador web actualizado, desde computadora o celular. |
| RC02 | Control de versiones | El código fuente y los documentos deben gestionarse con Git y mantenerse en un repositorio compartido en GitHub. |
| RC03 | API REST | La comunicación entre el frontend y los servicios del sistema debe realizarse mediante una API REST. |
| RC04 | Contenedores y orquestación | El sistema debe desplegarse en contenedores Docker, con Kubernetes como orquestador objetivo para permitir el escalado automático en producción. En el despliegue académico del Sprint 3 se utiliza una instancia EC2 con docker-compose, por costo. |
| RC05 | Caché en memoria | Las fichas activas y las respuestas temporales durante el examen deben almacenarse en Redis, para no saturar la base de datos. |
| RC06 | Procesamiento asíncrono | El cálculo de puntajes y del ranking debe realizarse en segundo plano mediante colas de mensajes (RabbitMQ). |
| RC07 | Base de datos relacional | La información definitiva debe almacenarse en PostgreSQL. |
| RC08 | Enfoque offline-first | El cliente debe guardar las respuestas localmente y sincronizarlas con el servidor, tolerando conexión a internet intermitente. |
| RC09 | Autenticación propia | El acceso debe realizarse con credenciales generadas por el sistema (usuario dni@sofia.edu y contraseña inicial igual al DNI), sin autoregistro de ningún usuario: el personal encargado registra a los postulantes y el administrador registra a los docentes. |
| RC10 | Examen único por simulacro | Todos los postulantes de un mismo simulacro deben recibir la misma versión y el mismo orden del examen. |
| RC11 | Sin integración con la transmisión de clases | El sistema no se integra con la transmisión de clases virtuales de la academia (fuera de alcance). |
| RC12 | Validación docente de preguntas generadas | Las preguntas propuestas por la inteligencia artificial a partir de las separatas no deben incorporarse al banco de preguntas sin la revisión y aprobación previa del docente. |
| RC13 | Despliegue en AWS | El sistema debe desplegarse en Amazon Web Services, aprovechando los créditos de la cuenta, con las separatas almacenadas en S3 en el despliegue. |
| RC14 | Servicio de IA de capa gratuita | El servicio de inteligencia artificial se consume mediante una capa gratuita con límites de uso, detrás de una interfaz que permita cambiar de proveedor sin modificar los módulos. |sss