# Arquitectura inicial del sistema

## Diagrama de arquitectura

```mermaid
flowchart TD

    subgraph ACTORES["ACTORES"]
        Postulante["Postulante"]
        Docente["Docente"]
        Admin["Administrador"]
    end

    subgraph PRESENTACION["PRESENTACIÓN"]
        Web["Aplicación Web → API REST"]
    end

    subgraph NEGOCIO["LÓGICA DE NEGOCIO"]
        Usuarios["Registro de Usuarios"]
        Banco["Banco de Preguntas"]
        Rendicion["Rendición de Examen"]
        Resultados["Procesamiento de Resultados"]
        Ranking["Ranking y Reportes"]
        Analitica["Analítica del Estudiante"]
    end

    subgraph DATOS["DATOS"]
        Redis["Redis"]
        PG["PostgreSQL"]
    end

    subgraph EXTERNOS["SISTEMAS EXTERNOS"]
        IA["Servicio de Inteligencia Artificial"]
    end

    ACTORES --> PRESENTACION
    PRESENTACION --> NEGOCIO
    NEGOCIO --> DATOS
    DATOS -->|Integraciones| EXTERNOS

    Postulante ~~~ Docente
    Docente ~~~ Admin

    Usuarios ~~~ Banco
    Banco ~~~ Rendicion
    Rendicion ~~~ Resultados
    Resultados ~~~ Ranking
    Ranking ~~~ Analitica

    Redis ~~~ PG

    style ACTORES fill:#222,stroke:#fff,stroke-width:2px,color:#fff
    style PRESENTACION fill:#222,stroke:#fff,stroke-width:2px,color:#fff
    style NEGOCIO fill:#222,stroke:#fff,stroke-width:2px,color:#fff
    style DATOS fill:#222,stroke:#fff,stroke-width:2px,color:#fff
    style EXTERNOS fill:#222,stroke:#fff,stroke-width:2px,color:#fff

    style Postulante fill:#222,stroke:#fff,color:#fff
    style Docente fill:#222,stroke:#fff,color:#fff
    style Admin fill:#222,stroke:#fff,color:#fff
    style Web fill:#222,stroke:#fff,color:#fff
    style Usuarios fill:#222,stroke:#fff,color:#fff
    style Banco fill:#222,stroke:#fff,color:#fff
    style Rendicion fill:#222,stroke:#fff,color:#fff
    style Resultados fill:#222,stroke:#fff,color:#fff
    style Ranking fill:#222,stroke:#fff,color:#fff
    style Analitica fill:#222,stroke:#fff,color:#fff
    style Redis fill:#222,stroke:#fff,color:#fff
    style PG fill:#222,stroke:#fff,color:#fff
    style IA fill:#222,stroke:#fff,color:#fff
```

## Descripción

La arquitectura inicial se organiza en tres capas principales y un conjunto de sistemas externos:

- **Presentación:** permite la interacción de los usuarios con el sistema mediante la aplicación web y la API REST.
- **Lógica de negocio:** contiene los principales módulos responsables de las funcionalidades del sistema: registro de usuarios, banco de preguntas, rendición de examen, procesamiento de resultados, ranking y reportes, y analítica del estudiante.
- **Datos:** permite almacenar y consultar la información mediante Redis (almacenamiento temporal durante el examen) y PostgreSQL (almacenamiento definitivo).
- **Sistemas externos:** el servicio de inteligencia artificial, con el que el sistema se integra para generar las recomendaciones de refuerzo académico.

Además, el módulo de **Rendición de Examen** guarda las respuestas en **Redis**, y el módulo de **Procesamiento de Resultados** las calcula en segundo plano y las consolida en **PostgreSQL**.