CREATE TABLE examenes_rendicion (
  id text PRIMARY KEY,
  postulante_id text NOT NULL,
  simulacro_id text NOT NULL,
  inicio timestamptz NOT NULL,
  vence timestamptz NOT NULL CHECK (vence > inicio),
  cierre timestamptz CHECK (cierre >= inicio AND cierre <= vence),
  respuestas jsonb CHECK (jsonb_typeof(respuestas) = 'array'),
  UNIQUE (postulante_id, simulacro_id),
  CHECK ((cierre IS NULL) = (respuestas IS NULL))
);

CREATE INDEX examenes_rendicion_vencimiento ON examenes_rendicion (vence, id) WHERE cierre IS NULL;

CREATE TABLE envios_examen_finalizado (
  examen_id text PRIMARY KEY REFERENCES examenes_rendicion(id),
  publicado boolean NOT NULL DEFAULT false
);

CREATE INDEX envios_examen_pendientes ON envios_examen_finalizado (examen_id) WHERE NOT publicado;
