CREATE TABLE resultados_examen (
  examen_id text PRIMARY KEY,
  postulante_id text NOT NULL,
  simulacro_id text NOT NULL,
  puntaje_centesimos integer NOT NULL CHECK (puntaje_centesimos BETWEEN 0 AND 100000),
  correctas integer NOT NULL CHECK (correctas >= 0),
  incorrectas integer NOT NULL CHECK (incorrectas >= 0),
  omitidas integer NOT NULL CHECK (omitidas >= 0),
  por_curso jsonb NOT NULL CHECK (jsonb_typeof(por_curso) = 'array'),
  detalle jsonb NOT NULL CHECK (jsonb_typeof(detalle) = 'array'),
  CHECK (correctas + incorrectas + omitidas = jsonb_array_length(detalle)),
  CHECK (jsonb_array_length(detalle) > 0)
);
CREATE INDEX resultados_examen_simulacro ON resultados_examen (simulacro_id, examen_id);
CREATE INDEX resultados_examen_postulante ON resultados_examen (postulante_id, examen_id);
