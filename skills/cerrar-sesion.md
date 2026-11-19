# Skill: cerrar la sesión y dejar el traspaso

Úsalo cuando termines de trabajar, cuando te queden pocos tokens, o antes de que el usuario cambie de IDE. El siguiente agente no recordará nada de esta sesión: todo lo que no quede escrito en el repositorio se pierde.

## Pasos

1. **Deja el código en un punto estable.** No dejes archivos a medias que no compilen. Si no puedes terminar la tarea, deja lo que sí funciona y anota lo que falta.
2. **Ejecuta las pruebas** (`npm test`, cuando ya exista el proyecto base) y anota si pasan o no.
3. **Marca `[x]` en `tasks.md` solo las tareas completas**, es decir, con su código terminado y sus pruebas pasando. Una tarea a medias no se marca.
4. **Actualiza `PROGRESO.md`:**
   - La tabla de módulos, con el estado de cada uno (sin empezar, en curso, terminado).
   - "Última tarea completada": el número y el nombre de la tarea.
   - "Tarea en curso / pendiente a medias": qué quedó hecho y qué falta.
   - "Siguiente paso exacto": una instrucción concreta, con el archivo y la acción (por ejemplo: "crear `src/modules/usuarios/dominio/usuario.ts` con la entidad Usuario según la tarea 2").
   - "Notas para el siguiente editor": problemas encontrados, comandos útiles y decisiones tomadas.
5. **Haz el commit**: `feat: ...` si la tarea quedó completa, o `wip: ...` si quedó incompleta.
6. **Haz `git push`**, para que el siguiente IDE vea el estado más reciente.
7. **Resume al usuario en 3 o 4 líneas:** qué se hizo, qué sigue y si algo requiere su decisión.

## Reglas

- No inventes decisiones. Si tomaste una decisión que no está en `docs/` ni en el `spec.md`, anótala en "Notas para el siguiente editor" y avisa al usuario para que la documente.
- Si algo contradice un ADR o una restricción, no lo resuelvas por tu cuenta: déjalo anotado y pregunta.
- Nunca dejes secretos, claves ni contraseñas reales en el repositorio, ni en `PROGRESO.md`.
- Si el último `git push` falla, dilo al usuario; no lo dejes pasar.

## Ejemplo de "Siguiente paso exacto"

> Tarea 4 de `specs/usuarios/tasks.md`: implementar la generación automática de credenciales en `src/modules/usuarios/aplicacion/generar-credenciales.ts`. Las pruebas de la tarea 3 ya pasan. Usar bcrypt para el hash, según AC04.