# Skill: escribir pruebas con Jest

Úsalo al terminar el dominio y la aplicación de un caso de uso (paso 3 de `skills/implementar-caso-de-uso.md`), y cada vez que una tarea de `tasks.md` pida pruebas. El Sprint 2 evalúa pruebas automatizadas con Jest y su reporte de cobertura (`docs/sprint-2.md`).

## Qué se prueba y qué no

- **Pruebas unitarias** (la mayoría): casos de uso y reglas del dominio, con repositorios y puertos **simulados**. No usan base de datos, Redis, RabbitMQ ni red. Son rápidas y no dependen de Docker.
- **Pruebas de integración** (pocas, solo donde aporten): repositorios contra PostgreSQL real y endpoints con la API levantada. Se ejecutan con `docker compose up`.
- **Pruebas de carga con k6:** no van aquí. Van en `tests/carga/` y se hacen al final del Sprint 2.

## Dónde van los archivos

- Cada prueba junto al código que prueba, con el mismo nombre y la terminación `.test.ts`. Ejemplo: `registrar-estudiante.use-case.ts` y `registrar-estudiante.use-case.test.ts`.
- Los simulados reutilizables (repositorios en memoria, `ServicioIA` simulado) viven en `src/compartido/pruebas/` para no repetirlos en cada módulo.

## Cómo escribir una prueba

1. **Una prueba por criterio de aceptación.** Cada criterio Dado / Cuando / Entonces de `specs/<modulo>/spec.md` debe tener al menos una prueba. Usa el código del criterio en el nombre (por ejemplo `CA-U01`) para poder rastrearlo.
2. **Estructura Dado / Cuando / Entonces:** prepara el escenario, ejecuta el caso de uso, verifica el resultado.
3. **Prueba también los casos que fallan:** datos inválidos, duplicados, acceso denegado. Los criterios de aceptación ya los listan.
4. **Repositorios simulados en memoria:** una clase que implementa el puerto del dominio y guarda los datos en un arreglo. Es mejor que simular cada método con `jest.fn()`, porque prueba el comportamiento y no la implementación.
5. **Nunca llames a la IA real.** Usa siempre el adaptador simulado de `ServicioIA`, que devuelve respuestas fijas. Así no se gasta la cuota gratuita y las pruebas son repetibles.
6. **Nunca uses el reloj ni números aleatorios sin control.** Si el caso de uso depende de la fecha o de un valor aleatorio, inyéctalo como dependencia para poder fijarlo en la prueba.
7. **Una prueba prueba una sola cosa y no depende de otra.** Cada prueba parte de un estado limpio.

## Qué debe verificar cada tipo de caso

| Caso | Verifica |
| --- | --- |
| Registro con datos válidos | Se guarda el usuario, tiene el rol correcto y la contraseña está con hash |
| Dato duplicado | Lanza el error de conflicto y no guarda nada |
| Dato inválido | Lanza el error de validación y no guarda nada |
| Rol sin permiso | Lanza el error de acceso denegado |
| Login | Devuelve el JWT con el rol correcto; con credenciales malas, error sin revelar cuál falló |

## Cobertura

- Ejecuta `npm test -- --coverage` y revisa el reporte antes de cerrar un módulo.
- El reporte se guarda en la carpeta `coverage/`, que va en `.gitignore`. Para el entregable del Sprint 2, se genera una captura o un archivo del reporte aparte, como evidencia.
- Los casos de uso y el dominio deben quedar con cobertura alta. Si un archivo de la capa de aplicación queda con cobertura baja, falta probar algún criterio de aceptación.
- Una cobertura alta no reemplaza revisar que cada criterio tenga su prueba.

## GitHub Actions

El workflow del módulo 0 ejecuta las pruebas en cada `git push`. Si una prueba falla en GitHub Actions, la tarea no está terminada, aunque pase en tu máquina.

## Lista de verificación antes de marcar la tarea `[x]`

- [ ] Cada criterio de aceptación del caso de uso tiene al menos una prueba, con su código (`CA-...`) en el nombre.
- [ ] Hay pruebas de los casos que fallan, no solo del camino feliz.
- [ ] Las pruebas unitarias no usan base de datos, red ni la IA real.
- [ ] `npm test` pasa completo, no solo el archivo nuevo.
- [ ] Revisaste el reporte de cobertura del módulo.