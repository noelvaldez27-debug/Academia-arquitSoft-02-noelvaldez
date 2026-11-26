ALTER TABLE configuraciones_simulacro ADD COLUMN requiere_padron boolean NOT NULL DEFAULT false;
ALTER TABLE configuraciones_simulacro ALTER COLUMN requiere_padron SET DEFAULT true;

CREATE TABLE padrones_simulacro_rendicion (
  simulacro_id text PRIMARY KEY,
  ciclo_id uuid NOT NULL,
  administrador_id text NOT NULL,
  habilitado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX padrones_simulacro_por_ciclo ON padrones_simulacro_rendicion (ciclo_id);

CREATE TABLE habilitados_simulacro_rendicion (
  simulacro_id text NOT NULL REFERENCES padrones_simulacro_rendicion(simulacro_id),
  postulante_id text NOT NULL,
  sede_id text NOT NULL,
  carrera text NOT NULL,
  condicion text,
  PRIMARY KEY (simulacro_id, postulante_id)
);
