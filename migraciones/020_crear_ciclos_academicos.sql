CREATE TABLE ciclos_academicos (
  id uuid PRIMARY KEY,
  nombre text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 120),
  inicia_el date NOT NULL,
  termina_el date NOT NULL CHECK (termina_el >= inicia_el),
  cerrado_en timestamptz,
  cerrado_por integer REFERENCES usuarios(id),
  CHECK ((cerrado_en IS NULL) = (cerrado_por IS NULL))
);

CREATE TABLE postulantes_ciclo (
  postulante_id integer NOT NULL REFERENCES usuarios(id),
  ciclo_id uuid NOT NULL REFERENCES ciclos_academicos(id),
  vinculado_en timestamptz NOT NULL DEFAULT now(),
  desvinculado_en timestamptz,
  PRIMARY KEY (postulante_id, ciclo_id)
);
CREATE UNIQUE INDEX postulante_un_ciclo_activo ON postulantes_ciclo (postulante_id) WHERE desvinculado_en IS NULL;
CREATE INDEX postulantes_por_ciclo ON postulantes_ciclo (ciclo_id, postulante_id) WHERE desvinculado_en IS NULL;
ALTER TABLE cargas_masivas ADD COLUMN ciclo_id uuid REFERENCES ciclos_academicos(id);
ALTER TABLE cargas_masivas ADD COLUMN recuperadas integer NOT NULL DEFAULT 0 CHECK (recuperadas >= 0);
