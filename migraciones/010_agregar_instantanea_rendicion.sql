ALTER TABLE examenes_rendicion
  ADD COLUMN carrera_inicial text,
  ADD COLUMN sede_inicial text,
  ADD COLUMN condicion_inicial text CHECK (condicion_inicial IN ('MATRICULADO', 'LIBRE'));

CREATE INDEX examenes_rendicion_simulacro_id ON examenes_rendicion (simulacro_id, id);
