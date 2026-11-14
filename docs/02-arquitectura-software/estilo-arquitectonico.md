# Estilo arquitectónico

**Estilo seleccionado:** Monolito modular con procesamiento asíncrono.

El backend de EVALUA-NET se organiza en módulos independientes dentro de una sola aplicación, mientras que los workers ejecutan tareas de procesamiento en segundo plano y el servicio de IA funciona de manera independiente.

Esta decisión responde principalmente a los drivers **DA01 (Escalabilidad), DA02 (Rendimiento), DA07 (Procesamiento asíncrono) y DA10 (Mantenibilidad)**, y está registrada en **ADR-001**.

## Módulos del sistema

| Módulo | Responsabilidad |
|---|---|
| Gestión de Usuarios | Registro, credenciales, autenticación y roles. |
| Banco de Preguntas | Cursos, temas, preguntas y separatas de los docentes. |
| Rendición de Examen | Intentos, temporizador, examen y respuestas. |
| Procesamiento de Resultados | Calificación y persistencia de puntajes. |
| Ranking y Reportes | Clasificaciones y exportación de resultados. |
| Analítica del Estudiante | Desempeño, evolución e información para recomendaciones. |

## Diagrama del estilo arquitectónico

```mermaid
flowchart TB
    subgraph USERS["Usuarios del sistema"]
        direction LR
        P["Postulante"]
        D["Docente"]
        A["Administrador"]
    end

    WEB["<b>Cliente Web</b><br/>Aplicación web · Offline-First"]

    P -->|"Usa"| WEB
    D -->|"Usa"| WEB
    A -->|"Usa"| WEB

    subgraph BACKEND["Backend EVALUA-NET · Monolito modular"]
        direction TB

        API["<b>API REST</b><br/>JWT · validación · control de roles · registro de eventos"]

        subgraph CTRL["Controllers por módulo"]
            direction LR
            C1["<b>Gestión de Usuarios</b><br/>UsuarioController"]
            C2["<b>Banco de Preguntas</b><br/>PreguntaController<br/>SeparataController"]
            C3["<b>Rendición de Examen</b><br/>ExamenController"]
            C4["<b>Procesamiento de Resultados</b><br/>ResultadoController"]
            C5["<b>Ranking y Reportes</b><br/>RankingController"]
            C6["<b>Analítica del Estudiante</b><br/>AnaliticaController"]
        end

        subgraph UCS["Casos de uso (lógica de negocio)"]
            direction LR
            U1["Registrar estudiantes<br/>Generar credenciales"]
            U2["Gestionar preguntas<br/>SubirSeparata<br/>ProponerPreguntas"]
            U3["IniciarExamen<br/>FinalizarExamenUseCase"]
            U4["CalcularPuntaje<br/>Guardar resultado"]
            U5["GenerarRanking<br/>Exportar resultados"]
            U6["Analizar desempeño<br/>Recomendar refuerzo"]
        end

        subgraph REPOS["Repositorios y adaptadores (infraestructura)"]
            direction LR
            R1["UsuarioRepository"]
            R2["PreguntaRepository<br/>SeparataRepository"]
            R3["ExamenRepository"]
            R4["ResultadoRepository"]
            R5["RankingRepository"]
            R6["AnaliticaRepository"]
            DAC["<b>Acceso a datos común</b><br/>Conexión y transacciones"]
            AC["Adaptador de caché"]
            AP["Publicador de eventos"]
            AF["Almacén y extractores<br/>de archivos"]
            AI["Adaptador de IA"]
        end
    end

    DB[("PostgreSQL<br/>datos definitivos")]
    REDIS[("Redis<br/>respuestas temporales")]
    MQ["RabbitMQ<br/>cola de eventos"]
    WORKER["Workers<br/>puntajes y extracción"]
    STO["Almacenamiento<br/>separatas originales"]
    IA["Servicio de IA<br/>(sistema externo)"]

    WEB -->|"HTTPS / JSON"| API

    API --> C1
    API --> C2
    API --> C3
    API --> C4
    API --> C5
    API --> C6

    C1 --> U1
    C2 --> U2
    C3 --> U3
    C4 --> U4
    C5 --> U5
    C6 --> U6

    U1 --> R1
    U2 --> R2
    U3 --> R3
    U4 --> R4
    U5 --> R5
    U6 --> R6
    U3 --> AC
    U3 --> AP
    U2 --> AF
    U6 --> AI

    R1 --> DAC
    R2 --> DAC
    R3 --> DAC
    R4 --> DAC
    R5 --> DAC
    R6 --> DAC

    DAC -->|"SQL / TCP"| DB
    AC -->|"RESP"| REDIS
    AP -->|"AMQP"| MQ
    AF -->|"S3 API / HTTPS"| STO
    AI -->|"HTTPS / REST"| IA
    MQ --> WORKER
    WORKER -->|"SQL / TCP"| DB

    classDef gris fill:#4b5563,stroke:#1f2937,color:#ffffff
    classDef blanco fill:#ffffff,stroke:#374151,color:#111827
    classDef servicio fill:#ffffff,stroke:#388e3c,color:#1b5e20
    classDef repo fill:#ffffff,stroke:#ef6c00,color:#5d4037
    classDef datos fill:#fff3e0,stroke:#ef6c00,color:#5d4037
    classDef externo fill:#e8f5e9,stroke:#388e3c,color:#1b5e20

    class P,D,A blanco
    class WEB gris
    class API,C1,C2,C3,C4,C5,C6 blanco
    class U1,U2,U3,U4,U5,U6 servicio
    class R1,R2,R3,R4,R5,R6,DAC,AC,AP,AF,AI repo
    class DB,REDIS datos
    class MQ,WORKER,STO,IA externo

    style USERS fill:#4b5563,stroke:#1f2937,color:#ffffff
    style BACKEND fill:#ffffff,stroke:#555555,stroke-width:1.5px,color:#000000
    style CTRL fill:#e3f2fd,stroke:#90caf9,color:#0d47a1
    style UCS fill:#e8f5e9,stroke:#a5d6a7,color:#1b5e20
    style REPOS fill:#fff3e0,stroke:#ffcc80,color:#5d4037
```

## Leyenda

- **Gris oscuro:** usuarios y cliente web. **Blanco con borde gris:** API y controllers.
- **Banda azul:** controllers por módulo. **Banda verde:** casos de uso. **Banda naranja:** repositorios y adaptadores de infraestructura.
- **Verde claro:** servicios que funcionan fuera del backend principal (RabbitMQ, workers, almacenamiento y servicio de IA).
- **Flecha:** relación en tiempo de ejecución; el texto indica el protocolo cuando corresponde.

## Reglas de la arquitectura

1. Todos los módulos del negocio forman parte de una sola aplicación backend.
2. Cada módulo se organiza internamente mediante Clean Architecture.
3. Un módulo no accede directamente a los repositorios ni a las tablas de otro módulo.
4. La comunicación entre módulos se realiza mediante sus interfaces públicas.
5. Las tareas de procesamiento asíncrono se ejecutan mediante RabbitMQ y workers independientes.
6. El servicio de inteligencia artificial se mantiene separado del backend principal.
7. Las separatas de los docentes se guardan fuera de la base de datos y su texto se extrae en segundo plano; la IA solo propone preguntas y el docente las aprueba.  