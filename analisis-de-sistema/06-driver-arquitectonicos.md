# Drivers arquitectónicos

| ID | Driver arquitectónico | Origen | ¿Por qué influye en la arquitectura? |
| --- | --- | --- | --- |
| DA01 | El sistema debe soportar hasta 5,000 postulantes conectados al mismo tiempo durante un simulacro masivo. | AC03 – Escalabilidad | Obliga a una infraestructura que escale automáticamente y se reduzca al terminar el evento. |
| DA02 | El postulante debe ver su nota en pocos segundos, aunque el ranking general tarde minutos. | AC01 – Rendimiento | Obliga a separar la respuesta inmediata del procesamiento pesado, usando caché en memoria y colas. |
| DA03 | El sistema debe estar disponible casi al 100% durante las horas críticas del examen. | AC02 – Disponibilidad | Influye en el uso de varias instancias, balanceo de carga y protección de la base de datos. |
| DA04 | El examen debe continuar y no perder respuestas si la conexión es intermitente. | AC07 – Resiliencia / RC08 – Offline-first | Influye en el diseño del cliente, que guarda localmente y sincroniza en segundo plano. |
| DA05 | Los datos personales y académicos deben estar protegidos con cifrado y control de acceso por rol. | AC04 – Seguridad | Influye en la autenticación, la autorización por rol y la protección de los datos. |
| DA06 | El sistema debe usar infraestructura mínima en días regulares y crecer solo en los picos. | AC08 – Eficiencia de costos | Influye en el uso de contenedores y orquestación con escalado automático. |
| DA07 | El cálculo de puntajes y rankings debe hacerse en segundo plano mediante colas. | RC06 – Procesamiento asíncrono | Condiciona la comunicación entre componentes y la existencia de procesos Worker. |
| DA08 | Las respuestas del examen deben guardarse primero en Redis y luego en PostgreSQL. | RC05 – Caché en memoria / RC07 – Base de datos relacional | Condiciona la organización de la capa de datos en una persistencia temporal y una definitiva. |
| DA09 | El sistema debe usar una API REST para la comunicación entre el frontend y el backend. | RC03 – API REST | Limita las alternativas de comunicación entre las partes del sistema. |
| DA10 | El sistema debe permitir agregar nuevas sedes o módulos sin afectar los existentes. | AC05 – Mantenibilidad | Influye en la separación del sistema en módulos independientes. |