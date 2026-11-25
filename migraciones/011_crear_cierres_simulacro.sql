CREATE TABLE cierres_simulacro_rendicion (
  simulacro_id text PRIMARY KEY,
  administrador_id text NOT NULL,
  solicitado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  cerrado_en timestamptz CHECK (cerrado_en >= solicitado_en)
);

CREATE INDEX cierres_simulacro_pendientes ON cierres_simulacro_rendicion (simulacro_id)
  WHERE cerrado_en IS NULL;
