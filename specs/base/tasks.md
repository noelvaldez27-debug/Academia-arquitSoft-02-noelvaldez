# Tareas — Módulo 0: Base del proyecto

> Basado en: Sprint 2 (actividades 7 y 8) | Sprint 3 (entregable 4) | RC02, RC04, RC05, RC06, RC07, RC13 | ADR-001, ADR-002, ADR-012, ADR-013. Ruta: raíz del repositorio y `src/compartido/`
> Este módulo no tiene casos de uso propios: deja listo lo que todos los demás módulos necesitan.

- [ ] 1. Inicializar el proyecto Node.js + TypeScript (package.json, tsconfig, carpetas src/modules/ y src/compartido/)
- [ ] 2. Configurar Jest con TypeScript y reporte de cobertura
- [ ] 3. Dockerfile del backend
- [ ] 4. docker-compose.yml con el backend, PostgreSQL, Redis y RabbitMQ
- [ ] 5. Configuración desde variables de entorno: `.env.example` documentado y `.env` en `.gitignore` (ningún secreto en el repositorio)
- [ ] 6. Conexiones base a PostgreSQL, Redis y RabbitMQ en `src/compartido/infraestructura/`
- [ ] 7. Servidor base con endpoint de salud (`/health`) y Swagger montado en `/api-docs`
- [ ] 8. Puertos compartidos `ServicioIA` y `AlmacenArchivos` con sus adaptadores simulado (IA) y de disco local (archivos), según ADR-010 y ADR-012
- [ ] 9. Workflow de GitHub Actions que instala, compila y ejecuta Jest con cobertura en cada push
- [ ] 10. Crear `docs/despliegue.md` con el procedimiento para levantar el proyecto con `docker compose up`
- [ ] 11. Verificar que `docker compose up` levanta todo sin configuración manual y que `/health` responde