CREATE TABLE cursos_banco (
  id text PRIMARY KEY,
  nombre text NOT NULL CHECK (btrim(nombre) <> '')
);

CREATE TABLE separatas (
  id text PRIMARY KEY,
  docente_id text NOT NULL,
  curso_id text NOT NULL REFERENCES cursos_banco(id),
  archivo text NOT NULL,
  mime text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('SUBIDA', 'EN_EXTRACCION', 'TEXTO_EXTRAIDO', 'PREGUNTAS_PROPUESTAS', 'ERROR_EXTRACCION')),
  texto text,
  motivo text
);

CREATE TABLE propuestas_banco (
  id text PRIMARY KEY,
  separata_id text NOT NULL REFERENCES separatas(id),
  contenido jsonb NOT NULL,
  estado text NOT NULL CHECK (estado IN ('PROPUESTA', 'APROBADA', 'RECHAZADA'))
);
CREATE INDEX propuestas_banco_separata ON propuestas_banco(separata_id);

CREATE TABLE preguntas_banco (
  id text PRIMARY KEY,
  curso_id text NOT NULL REFERENCES cursos_banco(id),
  contenido jsonb NOT NULL,
  habilitada boolean NOT NULL,
  propuesta_id text UNIQUE REFERENCES propuestas_banco(id)
);
CREATE INDEX preguntas_banco_curso ON preguntas_banco(curso_id);

CREATE TABLE configuraciones_simulacro (
  id text PRIMARY KEY,
  duracion_minutos integer NOT NULL CHECK (duracion_minutos > 0),
  preguntas jsonb NOT NULL CHECK (jsonb_typeof(preguntas) = 'array')
);

CREATE TABLE autorizaciones_separata (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  separata_id text NOT NULL REFERENCES separatas(id),
  autorizador_id text NOT NULL,
  fecha timestamptz NOT NULL,
  estado text NOT NULL CHECK (estado IN ('AUTORIZADA', 'REVOCADA')),
  alcance text[] NOT NULL CHECK (alcance <@ ARRAY['texto', 'adjunto']::text[])
);
CREATE INDEX autorizaciones_separata_vigente ON autorizaciones_separata(separata_id, id DESC);

CREATE TABLE envios_separata (
  separata_id text PRIMARY KEY REFERENCES separatas(id),
  publicado boolean NOT NULL DEFAULT false
);
