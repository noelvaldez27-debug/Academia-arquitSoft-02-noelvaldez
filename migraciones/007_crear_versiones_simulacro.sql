CREATE TABLE versiones_simulacro (
  id text PRIMARY KEY REFERENCES configuraciones_simulacro(id),
  duracion_minutos integer NOT NULL CHECK (duracion_minutos > 0),
  preguntas jsonb NOT NULL CHECK (jsonb_typeof(preguntas) = 'array')
);
