CREATE TABLE proyecciones_ranking (
  simulacro_id text PRIMARY KEY,
  datos jsonb NOT NULL CHECK (jsonb_typeof(datos) = 'object'),
  actualizado_en timestamptz NOT NULL DEFAULT clock_timestamp()
);
