CREATE TABLE asignaciones_docentes_banco (
  docente_id text NOT NULL,
  curso_id text NOT NULL REFERENCES cursos_banco(id),
  PRIMARY KEY (docente_id, curso_id)
);
