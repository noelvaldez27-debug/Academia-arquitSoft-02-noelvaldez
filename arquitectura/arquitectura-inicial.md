# Arquitectura inicial del sistema

## Diagrama de arquitectura

~~~mermaid
flowchart TD

    %% =========================
    %% ACTORES
    %% =========================
    subgraph ACTORES["ACTORES"]
        Postulante["Postulante"]
        Docente["Docente"]
        Admin["Administrador"]
    end

    %% =========================
    %% PRESENTACIÓN
    %% =========================
    subgraph PRESENTACION["PRESENTACIÓN"]
        Web["Aplicación Web → API REST"]
    end

    %% =========================
    %% LÓGICA DE NEGOCIO
    %% =========================
    subgraph NEGOCIO["LÓGICA DE NEGOCIO"]
        Usuarios["Registro de Usuarios"]
        Banco["Banco de Preguntas"]
        Rendicion["Rendición de Examen"]
        Resultados["Procesamiento de Resultados"]
        Ranking["Ranking y Reportes"]
        Analitica["Analítica del Estudiante"]
        IA["Inteligencia Artificial"]
    end

    %% =========================
    %% DATOS
    %% =========================
    subgraph DATOS["DATOS"]
        Redis["Redis"]
        PG["PostgreSQL"]
    end

    %% =========================
    %% FLUJO PRINCIPAL
    %% =========================
    ACTORES --> PRESENTACION
    PRESENTACION --> NEGOCIO
    NEGOCIO --> DATOS

    %% =========================
    %% DISTRIBUCIÓN HORIZONTAL
    %% =========================
    Postulante ~~~ Docente
    Docente ~~~ Admin

    Usuarios ~~~ Banco
    Banco ~~~ Rendicion
    Rendicion ~~~ Resultados
    Resultados ~~~ Ranking
    Ranking ~~~ Analitica
    Analitica ~~~ IA

    Redis ~~~ PG

    %% =========================
    %% ESTILOS
    %% =========================
    style ACTORES fill:#222,stroke:#fff,stroke-width:2px,color:#fff
    style PRESENTACION fill:#222,stroke:#fff,stroke-width:2px,color:#fff
    style NEGOCIO fill:#222,stroke:#fff,stroke-width:2px,color:#fff
    style DATOS fill:#222,stroke:#fff,stroke-width:2px,color:#fff

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
    style IA fill:#222,stroke:#fff,color:#fff

    style Redis fill:#222,stroke:#fff,color:#fff
    style PG fill:#222,stroke:#fff,color:#fff
~~~

## Descripción

La arquitectura inicial se organiza en tres capas principales:

- **Presentación:** permite la interacción de los usuarios con el sistema mediante la aplicación web y la API REST.
- **Lógica de negocio:** contiene los principales módulos responsables de las funcionalidades del sistema: registro de usuarios, banco de preguntas, rendición de examen, procesamiento de resultados, ranking y reportes, analítica del estudiante e inteligencia artificial.
- **Datos:** permite almacenar y consultar la información mediante Redis (almacenamiento temporal durante el examen) y PostgreSQL (almacenamiento definitivo).

Además, el módulo de **Rendición de Examen** guarda las respuestas en **Redis**, y el módulo de **Procesamiento de Resultados** las calcula en segundo plano y las consolida en **PostgreSQL**.