
# Diseño interno de módulos

**Proyecto:** EVALUA-NET – Sistema de simulacros de exámenes virtuales con IA – Academia Sofía  
**Módulo de referencia:** Rendición de Examen  
**Tecnología de referencia:** Node.js + TypeScript  
**Enfoque arquitectónico:** Clean Architecture dentro del monolito modular  
**Nivel C4 relacionado:** Nivel 4 – Código  
**Versión:** 1.0


## 1. Propósito

Este documento describe cómo se organiza internamente el código del módulo Rendición de Examen del sistema EVALUA-NET.

Tiene tres objetivos principales:

- Establecer una estructura común para desarrollar los módulos del sistema.
- Separar las reglas del negocio de tecnologías como Redis, PostgreSQL y frameworks.
- Facilitar el mantenimiento, las pruebas y la incorporación de nuevas funcionalidades.

El módulo Rendición de Examen permite que los postulantes inicien simulacros, registren sus respuestas y finalicen sus evaluaciones.

Además, contempla el almacenamiento temporal de respuestas y su sincronización cuando existen problemas de conexión a internet.

## 2. Estructura de carpetas

El sistema utiliza un monolito modular. Cada módulo mantiene una organización interna basada en Clean Architecture.

Para el módulo Rendición de Examen se propone la siguiente estructura:

```text
src/
└── modules/
    └── rendicion-examen/
        ├── dominio/
        │   ├── examen.ts
        │   ├── respuesta.ts
        │   ├── estado-examen.ts
        │   └── examen-repository.ts
        │
        ├── aplicacion/
        │   ├── iniciar-examen.use-case.ts
        │   ├── registrar-respuesta.use-case.ts
        │   ├── finalizar-examen.use-case.ts
        │   ├── registrar-respuesta.command.ts
        │   ├── respuestas-temporales.port.ts
        │   └── publicador-examen.port.ts
        │
        ├── infraestructura/
        │   ├── postgres-examen-repository.ts
        │   ├── redis-respuestas.adapter.ts
        │   └── rabbitmq-examen.adapter.ts
        │
        ├── presentacion/
        │   ├── examen.controller.ts
        │   └── examen.routes.ts
        │
        ├── rendicion.module.ts
        └── index.ts
```

### 2.1. Responsabilidad de los archivos

| Archivo | Capa | Responsabilidad | Depende de |
|---|---|---|---|
| examen.ts | Dominio | Representar el examen y controlar sus estados. | Dominio |
| respuesta.ts | Dominio | Representar las respuestas del postulante. | Ninguna dependencia externa |
| estado-examen.ts | Dominio | Definir los estados del examen. | Ninguna |
| examen-repository.ts | Dominio | Declarar operaciones para consultar y guardar exámenes. | Dominio |
| iniciar-examen.use-case.ts | Aplicación | Validar e iniciar un simulacro. | Dominio |
| registrar-respuesta.use-case.ts | Aplicación | Coordinar el registro de respuestas. | Dominio y puertos |
| finalizar-examen.use-case.ts | Aplicación | Finalizar el examen y solicitar su procesamiento. | Dominio y puertos |
| registrar-respuesta.command.ts | Aplicación | Definir los datos necesarios para registrar una respuesta. | Ninguna |
| respuestas-temporales.port.ts | Aplicación | Definir operaciones para almacenar y recuperar respuestas temporales. | Dominio |
| publicador-examen.port.ts | Aplicación | Definir la publicación de exámenes finalizados. | Ninguna tecnología concreta |
| postgres-examen-repository.ts | Infraestructura | Implementar la persistencia definitiva con PostgreSQL. | Contratos internos y PostgreSQL |
| redis-respuestas.adapter.ts | Infraestructura | Implementar almacenamiento temporal con Redis. | Puerto y Redis |
| rabbitmq-examen.adapter.ts | Infraestructura | Publicar eventos mediante RabbitMQ. | Puerto y RabbitMQ |
| examen.controller.ts | Presentación | Recibir solicitudes HTTP y ejecutar casos de uso. | Aplicación |
| examen.routes.ts | Presentación | Definir las rutas REST del módulo. | Presentación |
| rendicion.module.ts | Composición | Conectar casos de uso, repositorios y adaptadores. | Todas las capas |
| index.ts | Composición | Exponer las funcionalidades públicas del módulo. | Composición |

Esta organización permite que cada archivo tenga una responsabilidad específica y evita mezclar reglas del negocio con detalles tecnológicos.

## 3. Capas del módulo y regla de dependencia

El módulo Rendición de Examen aplica las cuatro capas de Clean Architecture.

### 3.1. Diagrama de capas

```mermaid
flowchart TB
    subgraph P["PRESENTACIÓN"]
        CONT["ExamenController"]
        RUT["ExamenRoutes"]
    end

    subgraph A["APLICACIÓN"]
        INI["IniciarExamenUseCase"]
        REG["RegistrarRespuestaUseCase"]
        FIN["FinalizarExamenUseCase"]
        PORT["Puertos e interfaces"]
    end

    subgraph D["DOMINIO"]
        EX["Examen"]
        RES["Respuesta"]
        EST["EstadoExamen"]
        REPO["ExamenRepository"]
    end

    subgraph I["INFRAESTRUCTURA"]
        PG["PostgresExamenRepository"]
        RED["RedisRespuestasAdapter"]
        MQ["RabbitMQExamenAdapter"]
    end

    RUT --> CONT
    CONT --> INI
    CONT --> REG
    CONT --> FIN

    INI --> EX
    REG --> RES
    FIN --> EX

    INI --> REPO
    REG --> PORT
    FIN --> PORT
    FIN --> REPO

    PG -.-> REPO
    RED -.-> PORT
    MQ -.-> PORT
```

**Descripción:** El diagrama muestra la organización interna del módulo. Presentación utiliza los casos de uso de Aplicación, mientras que Infraestructura implementa los contratos definidos en las capas internas.

Las flechas continuas representan dependencias de uso y las discontinuas representan implementaciones de contratos.

### 3.2. Reglas de dependencia

| Capa | Contiene | Puede depender de | No debe depender de |
|---|---|---|---|
| Dominio | Entidades, reglas y contratos de negocio. | Elementos del propio dominio. | Aplicación, Presentación, Infraestructura y frameworks. |
| Aplicación | Casos de uso, comandos y puertos. | Dominio. | Redis, RabbitMQ, PostgreSQL y controladores HTTP. |
| Infraestructura | Repositorios y adaptadores tecnológicos. | Contratos internos y librerías externas. | Controladores de Presentación. |
| Presentación | Controladores y rutas REST. | Aplicación. | Implementaciones concretas de persistencia. |
| Composición | Configuración e inyección de dependencias. | Todas las capas. | No aplica. |

**Regla principal:** Las dependencias del código deben apuntar hacia las capas internas. El Dominio no debe conocer las tecnologías utilizadas para almacenar datos o comunicarse con otros componentes.

## 4. Diagrama de clases

El siguiente diagrama representa las principales clases e interfaces propuestas para el módulo Rendición de Examen.

```mermaid
classDiagram
    direction TB

    class Examen {
        +string id
        +string postulanteId
        +string simulacroId
        -EstadoExamen estado
        +iniciar()
        +finalizar()
        +estaActivo() boolean
    }

    class Respuesta {
        +string preguntaId
        +string alternativaId
        +Date fechaRegistro
    }

    class EstadoExamen {
        <<enumeration>>
        PENDIENTE
        EN_CURSO
        FINALIZADO
    }

    class ExamenRepository {
        <<interface>>
        +guardar(examen) Promise
        +buscarPorId(id) Promise
    }

    class RespuestasTemporalesPort {
        <<interface>>
        +guardar(examenId, respuesta) Promise
        +obtener(examenId) Promise
    }

    class PublicadorExamenPort {
        <<interface>>
        +publicarFinalizacion(examenId) Promise
    }

    class RegistrarRespuestaUseCase {
        -RespuestasTemporalesPort almacenamiento
        -ExamenRepository repositorio
        +ejecutar(command) Promise
    }

    class FinalizarExamenUseCase {
        -ExamenRepository repositorio
        -RespuestasTemporalesPort almacenamiento
        -PublicadorExamenPort publicador
        +ejecutar(examenId) Promise
    }

    class PostgresExamenRepository {
        +guardar(examen) Promise
        +buscarPorId(id) Promise
    }

    class RedisRespuestasAdapter {
        +guardar(examenId, respuesta) Promise
        +obtener(examenId) Promise
    }

    class RabbitMQExamenAdapter {
        +publicarFinalizacion(examenId) Promise
    }

    class ExamenController {
        +registrarRespuesta()
        +finalizarExamen()
    }

    Examen --> EstadoExamen
    Examen "1" o-- "0..*" Respuesta

    RegistrarRespuestaUseCase --> ExamenRepository
    RegistrarRespuestaUseCase --> RespuestasTemporalesPort

    FinalizarExamenUseCase --> ExamenRepository
    FinalizarExamenUseCase --> RespuestasTemporalesPort
    FinalizarExamenUseCase --> PublicadorExamenPort

    PostgresExamenRepository ..|> ExamenRepository
    RedisRespuestasAdapter ..|> RespuestasTemporalesPort
    RabbitMQExamenAdapter ..|> PublicadorExamenPort

    ExamenController --> RegistrarRespuestaUseCase
    ExamenController --> FinalizarExamenUseCase
```

### 4.1. Notación UML utilizada

| Símbolo | Significado |
|---|---|
| Línea continua con flecha | Asociación o dependencia de uso. |
| Línea discontinua con triángulo | Implementación de una interfaz. |
| Rombo vacío | Agregación entre elementos. |
| `<<interface>>` | Contrato que debe implementar otra clase. |
| `<<enumeration>>` | Conjunto de valores permitidos. |
| `+` | Atributo o método público. |
| `-` | Atributo o método privado. |

El diagrama permite identificar las clases principales y comprender cómo los casos de uso utilizan interfaces en lugar de depender directamente de Redis, PostgreSQL o RabbitMQ.

## 5. Flujo de ejecución: registrar y finalizar examen

Este flujo describe cómo el sistema registra las respuestas de un postulante y solicita el procesamiento del examen cuando finaliza.

### 5.1. Diagrama de secuencia

```mermaid
sequenceDiagram
    autonumber

    actor P as Postulante
    participant W as Aplicación Web
    participant C as ExamenController
    participant R as RegistrarRespuestaUseCase
    participant F as FinalizarExamenUseCase
    participant DB as PostgreSQL
    participant RD as Redis
    participant MQ as RabbitMQ
    participant WK as Worker

    P->>W: Selecciona una respuesta
    W->>W: Conserva la respuesta localmente
    W->>C: Envía respuesta mediante API REST
    C->>R: ejecutar(command)
    R->>DB: Verificar examen activo
    DB-->>R: Estado del examen
    R->>RD: Guardar respuesta temporal
    RD-->>R: Confirmación
    R-->>C: Respuesta registrada
    C-->>W: Confirmación HTTP

    Note over W: Si no hay conexión, conserva la respuesta y reintenta sincronizar

    P->>W: Finaliza el examen
    W->>C: Solicita finalizar examen
    C->>F: ejecutar(examenId)
    F->>RD: Recuperar respuestas temporales
    RD-->>F: Respuestas registradas
    F->>DB: Guardar respuestas definitivas y cierre
    DB-->>F: Confirmación
    F->>MQ: Publicar examen finalizado
    MQ-->>F: Confirmación
    F-->>C: Examen finalizado
    C-->>W: Confirmación HTTP

    MQ-->>WK: Entregar evento
    WK->>DB: Procesar puntaje y resultados
    DB-->>WK: Confirmación
```

**Descripción:** Durante el examen, las respuestas se conservan temporalmente en Redis y también en el almacenamiento local del navegador para soportar problemas de conexión.

Al finalizar, las respuestas se consolidan en PostgreSQL y se publica un evento en RabbitMQ para que un worker realice el procesamiento correspondiente.

El sistema debe evitar confirmar el cierre mientras existan respuestas locales pendientes de sincronización. También debe impedir respuestas posteriores al cierre autorizado.

### 5.2. Pasos del flujo

| Paso | Origen → Destino | Acción | Capa |
|---|---|---|---|
| 1 | Postulante → Web | Selecciona una alternativa. | Presentación |
| 2 | Web → Controlador | Envía la respuesta mediante API REST. | Presentación |
| 3 | Controlador → Caso de uso | Solicita registrar la respuesta. | Presentación → Aplicación |
| 4 | Caso de uso → Repositorio | Verifica que el examen esté activo. | Aplicación → Dominio |
| 5 | Caso de uso → Redis | Guarda temporalmente la respuesta. | Aplicación → Infraestructura mediante puerto |
| 6 | Redis → Web | Confirma el registro. | Infraestructura → Presentación |
| 7 | Postulante → Web | Solicita finalizar el examen. | Presentación |
| 8 | Web → Caso de uso | Solicita el cierre del examen. | Presentación → Aplicación |
| 9 | Caso de uso → Redis | Recupera las respuestas. | Aplicación → Infraestructura |
| 10 | Caso de uso → PostgreSQL | Guarda las respuestas definitivas y el cierre. | Aplicación → Infraestructura |
| 11 | Caso de uso → RabbitMQ | Publica el evento de finalización. | Aplicación → Infraestructura |
| 12 | RabbitMQ → Worker | Entrega el evento para procesar resultados. | Infraestructura |
| 13 | Worker → PostgreSQL | Almacena los resultados calculados. | Infraestructura y Aplicación |

**Consideración:** La confirmación de la finalización debe garantizar que el evento de procesamiento no se pierda. Para una implementación real se puede utilizar el patrón Transactional Outbox.

El cálculo de la nota individual deberá realizarse con la rapidez necesaria para cumplir el requisito de resultados inmediatos. El ranking general puede actualizarse de manera asíncrona.


