
# Principios de diseño (SOLID)

**Proyecto:** EVALUA-NET – Sistema de simulacros de exámenes virtuales con IA – Academia Sofía

## Objetivo

Documentar cómo se aplicarán los principios SOLID en el backend de EVALUA-NET, organizado mediante Clean Architecture, para que cada módulo tenga responsabilidades claras, sea fácil de mantener y las reglas del negocio no dependan directamente de las tecnologías utilizadas.

## Contexto

- **Estilo arquitectónico:** Monolito modular con procesamiento asíncrono y servicio de IA independiente.
- **Enfoque interno:** Clean Architecture (presentación, aplicación, dominio e infraestructura).
- **Tecnología de referencia:** Node.js + TypeScript.
- **Módulo de referencia:** Rendición de Examen, porque integra el registro de respuestas, almacenamiento temporal con Redis, persistencia en PostgreSQL y procesamiento mediante RabbitMQ.

## SOLID en el módulo Rendición de Examen

El siguiente diagrama representa cómo se aplican los principios SOLID en las principales clases e interfaces del módulo.

```mermaid
flowchart TB
    subgraph P["Presentación"]
        C["ExamenController<br/>Recibe solicitudes HTTP"]
    end

    subgraph A["Aplicación"]
        UC["RegistrarRespuestaUseCase<br/>Coordina el registro"]
    end

    subgraph D["Dominio y contratos internos"]
        E["Examen<br/>Valida reglas del negocio"]
        R["ExamenRepository<br/>Interfaz de persistencia"]
        T["RespuestasTemporalesPort<br/>Interfaz de almacenamiento temporal"]
    end

    subgraph I["Infraestructura"]
        PG["PostgresExamenRepository"]
        RD["RedisRespuestasAdapter"]
    end

    C --> UC
    UC --> E
    UC --> R
    UC --> T
    PG -.->|Implementa| R
    RD -.->|Implementa| T
```

**Descripción:** El diagrama muestra la separación de responsabilidades entre las capas y el uso de interfaces para evitar que los casos de uso dependan directamente de PostgreSQL o Redis.

### Aplicación de los principios SOLID

| **Principio** | **Dónde se aplica (capa)** | **Cómo se cumple en EVALUA-NET** | **Archivos de referencia** |
|---|---|---|---|
| **S** · Responsabilidad única | Todas las capas | Cada clase tiene una función específica: el controlador recibe solicitudes, el caso de uso registra respuestas, la entidad valida las reglas del examen y el repositorio almacena los datos. | `examen.controller.ts`, `registrar-respuesta.use-case.ts`, `examen.ts`, `postgres-examen-repository.ts` |
| **O** · Abierto/cerrado | Infraestructura | Si se necesita cambiar Redis por otra tecnología de almacenamiento temporal, se crea un nuevo adaptador sin modificar el caso de uso. | `respuestas-temporales.port.ts`, `redis-respuestas.adapter.ts` |
| **L** · Sustitución de Liskov | Infraestructura | Cualquier adaptador que implemente `RespuestasTemporalesPort` debe permitir guardar y recuperar respuestas respetando el mismo contrato, sin alterar el funcionamiento del caso de uso. | `respuestas-temporales.port.ts`, `redis-respuestas.adapter.ts` |
| **I** · Segregación de interfaces | Dominio y Aplicación | Cada interfaz contiene únicamente las operaciones necesarias: `ExamenRepository` permite guardar y buscar exámenes, mientras que `RespuestasTemporalesPort` permite almacenar y recuperar respuestas. | `examen-repository.ts`, `respuestas-temporales.port.ts` |
| **D** · Inversión de dependencias | Aplicación | Los casos de uso reciben interfaces mediante sus constructores y no conocen directamente PostgreSQL ni Redis. Las implementaciones concretas se conectan en la raíz de composición. | `registrar-respuesta.use-case.ts`, `rendicion.module.ts` |

**Nota:** Los archivos corresponden al diseño propuesto del sistema y servirán como referencia durante su implementación.

## Qué pasaría sin SOLID en EVALUA-NET

| **Situación real** | **Sin SOLID** | **Con SOLID** |
|---|---|---|
| Se cambia Redis por otra tecnología | Se tendría que modificar el caso de uso que registra las respuestas. | Se implementa un nuevo adaptador que respete la misma interfaz. |
| Se cambia PostgreSQL | Las consultas SQL podrían estar mezcladas con las reglas del examen. | Se reemplaza la implementación del repositorio sin modificar las reglas del negocio. |
| Se quiere probar el registro de respuestas | Se necesitaría conectar el sistema a Redis y PostgreSQL. | Se pueden utilizar repositorios y adaptadores simulados. |
| Cambia una regla para finalizar el examen | Se tendría que buscar la validación en controladores y servicios. | La regla se modifica en la entidad `Examen`. |
| Se incorpora otro mecanismo de mensajería | Se modificarían directamente los casos de uso que publican eventos. | Se crea otro adaptador que implemente `PublicadorExamenPort`. |

## Relación con Clean Architecture y los patrones

| **Principio** | **Lo cumple en el proyecto** |
|---|---|
| Responsabilidad única | La separación de responsabilidades entre Presentación, Aplicación, Dominio e Infraestructura. |
| Abierto/cerrado | El patrón Adapter, que permite agregar nuevas implementaciones sin modificar los casos de uso. |
| Sustitución de Liskov | Los adaptadores que implementan una misma interfaz y mantienen su comportamiento esperado. |
| Segregación de interfaces | Los contratos específicos como `ExamenRepository`, `RespuestasTemporalesPort` y `PublicadorExamenPort`. |
| Inversión de dependencias | Los patrones Repository y Dependency Injection, que permiten que los casos de uso dependan de interfaces y no de implementaciones concretas. |

## Beneficios

- Facilita el mantenimiento del sistema al separar las responsabilidades de cada clase.
- Permite cambiar tecnologías como PostgreSQL, Redis o RabbitMQ sin modificar las reglas del negocio, siempre que se respeten los contratos.
- Reduce el acoplamiento entre los componentes del backend.
- Facilita las pruebas mediante repositorios y adaptadores simulados.
- Permite incorporar nuevas funcionalidades sin afectar innecesariamente el código existente.

