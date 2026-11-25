CREATE TABLE historial_ranking_definitivo (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  simulacro_id text NOT NULL REFERENCES proyecciones_ranking(simulacro_id),
  datos_anteriores jsonb NOT NULL,
  publicado_en timestamptz NOT NULL,
  sustituido_en timestamptz NOT NULL DEFAULT clock_timestamp()
);
