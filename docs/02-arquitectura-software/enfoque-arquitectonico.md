# Enfoque arquitectónico

**Proyecto:** EVALUA-NET – Sistema de simulacros de exámenes virtuales con IA – Academia Sofía

| **Elemento** | **Descripción aplicada a EVALUA-NET** |
|---|---|
| Patrón / enfoque arquitectónico | Clean Architecture (Arquitectura Limpia). |
| Objetivo | Separar las responsabilidades del sistema y controlar las dependencias hacia el dominio. |
| ¿Qué problema resuelve? | Evita el acoplamiento entre la interfaz web, las reglas del negocio de los simulacros y las tecnologías externas, como PostgreSQL, Redis, RabbitMQ y el servicio de inteligencia artificial. |
| Capas definidas | Presentación, Aplicación, Dominio e Infraestructura. |
| Beneficios | • Facilita el mantenimiento y las pruebas unitarias.<br>• Permite cambiar tecnologías sin modificar las reglas del negocio.<br>• Mejora la organización de los módulos y la separación de responsabilidades. |

## Diagrama de Clean Architecture

```mermaid
flowchart TB
    P["<b>Postulante / Docente / Administrador</b><br/>[Personas]"]

    subgraph API["<b>API EVALUA-NET</b> · [Contenedor: backend · monolito modular · Clean Architecture]"]
        direction TB

        ROOT["<b>Raíz de composición</b><br/>[Componente: arranque]<br/>Único lugar que elige qué adaptador cumple cada contrato<br/>y lo inyecta en los casos de uso"]

        subgraph INF["Capa 4 · Infraestructura · implementa los puertos"]
            direction LR
            A1["<b>Repositorios</b><br/>[Adaptador]<br/>PostgreSQL"]
            A2["<b>Caché</b><br/>[Adaptador]<br/>Redis"]
            A3["<b>Publicador y Worker</b><br/>[Adaptador]<br/>RabbitMQ"]
            A4["<b>Extractores de texto</b><br/>[Adaptador · nuevo]<br/>PDF, DOCX, imagen (OCR)"]
            A5["<b>Almacén de archivos</b><br/>[Adaptador · nuevo]<br/>Separata original"]
            A6["<b>Adaptador de IA</b><br/>[Adaptador]<br/>Preguntas y recomendaciones"]
        end

        subgraph PRES["Capa 1 · Presentación"]
            direction LR
            C1["<b>Controllers REST</b><br/>[Componente]<br/>Uno por módulo"]
            C2["<b>Autenticación y roles</b><br/>[Componente]<br/>JWT"]
            C3["<b>Validación de entrada</b><br/>[Componente]<br/>DTOs"]
        end

        subgraph APL["Capa 2 · Aplicación · casos de uso"]
            direction TB
            subgraph UCS[" "]
                direction LR
                U1["<b>Usuarios y Banco</b><br/>[Casos de uso]<br/>RegistrarEstudiante<br/>GestionarPreguntas"]
                U2["<b>Rendición de Examen</b><br/>[Casos de uso]<br/>IniciarExamen<br/>FinalizarExamenUseCase"]
                U3["<b>Resultados y Analítica</b><br/>[Casos de uso]<br/>CalcularPuntaje<br/>GenerarRanking<br/>RecomendarRefuerzo"]
                U4["<b>Separatas</b><br/>[Casos de uso · nuevo]<br/>SubirSeparata · ExtraerTexto<br/>ProponerPreguntas<br/>AprobarPregunta"]
            end

            subgraph DOM["Capa 3 · Dominio"]
                direction LR
                subgraph PUE["Contratos (puertos)"]
                    direction LR
                    I1["<b>Repositorios</b><br/>[Interfaz]"]
                    I2["<b>CacheDeIntentos</b><br/>[Interfaz]"]
                    I3["<b>PublicadorDeEventos</b><br/>[Interfaz]"]
                    I4["<b>ExtractorDeTexto</b><br/>[Interfaz · nuevo]"]
                    I5["<b>AlmacenDeArchivos</b><br/>[Interfaz · nuevo]"]
                    I6["<b>GeneradorDePreguntas<br/>RecomendadorIA</b><br/>[Interfaz]"]
                end
                subgraph ENT["Entidades y reglas de negocio"]
                    direction LR
                    E1["<b>Usuario</b><br/>[Entidad]"]
                    E2["<b>Pregunta</b><br/>[Entidad]"]
                    E3["<b>Examen</b><br/>[Entidad]"]
                    E4["<b>Respuesta y<br/>Resultado</b><br/>[Entidad]"]
                    E5["<b>Separata</b><br/>[Entidad · nuevo]"]
                    E6["<b>Reglas de<br/>calificación</b><br/>[Reglas]"]
                end
            end
        end
    end

    PG["<b>PostgreSQL</b><br/>[Contenedor]"]
    RED["<b>Redis</b><br/>[Contenedor]"]
    MQ["<b>RabbitMQ</b><br/>[Contenedor]"]
    STO["<b>Almacenamiento</b><br/>[Contenedor: disco / S3 / MinIO]"]
    IA["<b>Servicio de IA</b><br/>[Sistema externo]<br/>Gemini u otro (por confirmar)"]

    P -->|"navegador · HTTPS / JSON"| PRES
    ROOT -.->|"registra"| INF
    PRES -->|"invoca"| UCS
    INF -->|"implementa"| PUE
    INF -->|"SQL / TCP"| PG
    INF -->|"RESP"| RED
    INF -->|"AMQP"| MQ
    INF -->|"S3 API / HTTPS"| STO
    INF -->|"HTTPS / REST"| IA

    classDef persona fill:#1f3b73,stroke:#14274d,color:#ffffff
    classDef contenedor fill:#3a6bc5,stroke:#2a4f96,color:#ffffff
    classDef pres fill:#ffffff,stroke:#5b8ad6,color:#0b1f44
    classDef infra fill:#ffffff,stroke:#9575cd,color:#2e1a5c
    classDef app fill:#ffffff,stroke:#43a047,color:#1b5e20
    classDef dom fill:#ffffff,stroke:#f9a825,color:#5d4037
    classDef nuevo fill:#ffe2c4,stroke:#f97316,color:#0b1f44,stroke-width:2px
    classDef externo fill:#8a8a8a,stroke:#666666,color:#ffffff

    class P persona
    class PG,RED,MQ,STO contenedor
    class ROOT,C1,C2,C3 pres
    class A1,A2,A3,A6 infra
    class U1,U2,U3 app
    class I1,I2,I3,I6,E1,E2,E3,E4,E6 dom
    class A4,A5,U4,I4,I5,E5 nuevo
    class IA externo

    style API fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1.5px,stroke-dasharray:6 4,color:#000000
    style INF fill:#ede7f6,stroke:#b39ddb,color:#2e1a5c
    style PRES fill:#e3f2fd,stroke:#90caf9,color:#0d47a1
    style APL fill:#e8f5e9,stroke:#a5d6a7,color:#1b5e20
    style UCS fill:#e8f5e9,stroke:#e8f5e9
    style DOM fill:#fff8e1,stroke:#ffcc80,color:#5d4037
    style PUE fill:#fffde7,stroke:#ffe082,color:#5d4037
    style ENT fill:#fffde7,stroke:#ffe082,color:#5d4037
```

## Leyenda

- **Azul oscuro:** personas. **Azul:** contenedor. **Gris:** sistema externo. **Naranja:** componente nuevo por la carga de separatas.
- **Recuadro morado:** Infraestructura. **Recuadro azul claro:** Presentación. **Recuadro verde:** Aplicación. **Recuadros amarillos:** Dominio (contratos y entidades).
- **Flecha «invoca»:** la Presentación llama a los casos de uso.
- **Flecha «implementa»:** los adaptadores de Infraestructura implementan los puertos definidos en el Dominio (inversión de dependencias).
- **Flecha «registra» (punteada):** la raíz de composición elige y registra los adaptadores.
- **Flechas con protocolo:** conexión de los adaptadores con los sistemas externos.

## Notas

- Las dependencias apuntan hacia el dominio: Presentación → Aplicación → Dominio; la Infraestructura depende de los contratos del Dominio.
- Un módulo usa a otro solo a través de su interfaz pública (servicio), nunca sus tablas.
- La IA solo propone preguntas y recomendaciones; el docente aprueba y la nota oficial la calculan reglas deterministas.
- El proveedor de IA, el OCR y el almacenamiento de archivos están por definir y validar.

## Regla de dependencia

1. El Dominio no depende de las capas externas ni de tecnologías como PostgreSQL o Redis.
2. Los casos de uso de Aplicación trabajan con entidades e interfaces, sin conocer las implementaciones concretas.
3. Los repositorios y adaptadores de Infraestructura implementan los contratos definidos en las capas internas.
4. Cambiar PostgreSQL, Redis, RabbitMQ, el proveedor de IA, el OCR o el almacenamiento no debe requerir modificar las reglas del Dominio.
5. Todos los módulos del backend de EVALUA-NET seguirán esta organización para mantener una arquitectura uniforme.