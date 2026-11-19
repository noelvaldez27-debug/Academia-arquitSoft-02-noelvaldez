# Skill: implementar un caso de uso

Úsalo cada vez que una tarea de `tasks.md` pida un caso de uso. Garantiza que todos los IDE escriban el código con la misma estructura de Clean Architecture (ADR-002).

## Antes de escribir código

1. Lee los criterios de aceptación del caso de uso en `specs/<modulo>/spec.md`. Son lo que debe cumplir el código y lo que probarán las pruebas.
2. Lee `docs/03-diseno-de-software/diseno-interno-de-modulos.md` para ver los nombres y la estructura de ese módulo.
3. Si algo no está definido en esos archivos, pregunta al usuario; no lo inventes.

## Orden de trabajo (de adentro hacia afuera)

1. **Dominio** (`dominio/`): entidades, reglas de negocio y el puerto del repositorio (`*-repository.ts`). No importa nada de fuera: ni Express, ni PostgreSQL, ni librerías de infraestructura.
2. **Aplicación** (`aplicacion/`):
   - `*.command.ts`: los datos de entrada del caso de uso, ya validados.
   - `*.use-case.ts`: una clase con un método `ejecutar()`, que recibe sus dependencias por constructor y solo conoce puertos.
   - `*.port.ts`: los puertos que necesita de otros módulos o de servicios externos (por ejemplo `ServicioIA`, `AlmacenArchivos`).
3. **Pruebas del caso de uso** con Jest, usando repositorios y puertos simulados (ver `skills/escribir-pruebas-jest.md`). Haz que pasen antes de seguir.
4. **Infraestructura** (`infraestructura/`): `postgres-*-repository.ts` y los `*.adapter.ts` que implementan los puertos.
5. **Presentación** (`presentacion/`): `*.controller.ts` y `*.routes.ts`. El controlador solo traduce la petición HTTP a un command, llama al caso de uso y traduce el resultado a una respuesta. No contiene reglas de negocio.
6. **Composición** (`<modulo>.module.ts`): crea las instancias y conecta cada puerto con su adaptador (inyección de dependencias).
7. **API pública** (`index.ts`): expone solo lo que otros módulos pueden usar, y nada más.
8. **Documentación OpenAPI** del endpoint nuevo.

## Reglas que no se rompen

- **Regla de dependencia:** Dominio no depende de nada; Aplicación depende solo de Dominio; Presentación depende de Aplicación; Infraestructura implementa los contratos de Dominio y Aplicación.
- Un módulo nunca importa archivos internos de otro módulo; solo usa su API pública a través de un puerto.
- Nunca importes Gemini, S3 ni librerías de IA o almacenamiento dentro de dominio o aplicación: se usan solo mediante `ServicioIA` y `AlmacenArchivos`.
- Los errores de negocio (DNI duplicado, acceso denegado, etc.) son errores propios del dominio; el controlador los traduce a códigos HTTP (409, 403, 401, 400).
- Contraseñas siempre con hash; nunca en texto plano, en respuestas ni en logs.
- Una tarea de `tasks.md` a la vez. No pases a la siguiente sin cerrar esta.

## Lista de verificación antes de marcar la tarea `[x]`

- [ ] Cada criterio de aceptación del caso de uso tiene al menos una prueba que pasa.
- [ ] El código compila sin errores.
- [ ] Dominio y aplicación no importan nada de infraestructura ni de presentación.
- [ ] El endpoint está documentado en OpenAPI.
- [ ] Hiciste commit (`feat: ...`) y, al cerrar la sesión, seguiste `skills/cerrar-sesion.md`.