
# Arquitectura del sistema EVALUA-NET

El sistema EVALUA-NET utiliza una **arquitectura de monolito modular con procesamiento asíncrono**, organizada mediante Clean Architecture.

El backend está dividido en seis módulos principales: Gestión de Usuarios, Banco de Preguntas, Rendición de Examen, Procesamiento de Resultados, Ranking y Reportes, y Analítica del Estudiante.

Utiliza PostgreSQL para almacenar información, Redis para las respuestas temporales y RabbitMQ con workers para procesar resultados de forma asíncrona. Además, se integra con un servicio independiente de inteligencia artificial.

## Diagrama de arquitectura

```mermaid
flowchart TB
    U["Postulante / Docente / Administrador"]
    WEB["Aplicación Web"]

    subgraph BACKEND["Backend EVALUA-NET - Monolito modular"]
        API["API REST"]

        subgraph MODULOS["Módulos del sistema"]
            M1["Gestión de Usuarios"]
            M2["Banco de Preguntas"]
            M3["Rendición de Examen"]
            M4["Procesamiento de Resultados"]
            M5["Ranking y Reportes"]
            M6["Analítica del Estudiante"]
        end
    end

    DB[("PostgreSQL")]
    REDIS[("Redis")]
    MQ["RabbitMQ"]
    WORKER["Workers"]
    IA["Servicio independiente de IA"]

    U --> WEB
    WEB --> API

    API --> M1
    API --> M2
    API --> M3
    API --> M4
    API --> M5
    API --> M6

    MODULOS --> DB
    M3 --> REDIS
    M3 --> MQ
    MQ --> WORKER
    WORKER --> DB
    M6 --> IA

    classDef app fill:#1976d2,stroke:#0d47a1,color:#ffffff
    classDef modulo fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
    classDef datos fill:#fff3e0,stroke:#ef6c00,color:#5d4037
    classDef externo fill:#e8f5e9,stroke:#388e3c,color:#1b5e20

    class WEB,API app
    class M1,M2,M3,M4,M5,M6 modulo
    class DB,REDIS datos
    class MQ,WORKER,IA externo
```

# Estilo arquitectónico

**Estilo seleccionado:** Monolito modular con procesamiento asíncrono.

El backend de EVALUA-NET se organiza en módulos independientes dentro de una sola aplicación, mientras que los workers ejecutan tareas de procesamiento en segundo plano y el servicio de IA funciona de manera independiente.

Esta decisión responde principalmente a los drivers **DA01 (Escalabilidad), DA02 (Rendimiento), DA07 (Procesamiento asíncrono) y DA10 (Mantenibilidad)**, y está registrada en **ADR-001**.

## Reglas de la arquitectura

1. Todos los módulos del negocio forman parte de una sola aplicación backend.
2. Cada módulo se organiza internamente mediante Clean Architecture.
3. Un módulo no accede directamente a los repositorios ni a las tablas de otro módulo.
4. La comunicación entre módulos se realiza mediante sus interfaces públicas.
5. Las tareas de procesamiento asíncrono se ejecutan mediante RabbitMQ y workers independientes.
6. El servicio de inteligencia artificial se mantiene separado del backend principal.
