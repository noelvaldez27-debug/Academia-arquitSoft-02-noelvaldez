ALTER TABLE cargas_masivas
  ADD COLUMN vinculadas integer NOT NULL DEFAULT 0 CHECK (vinculadas >= 0);
ALTER TABLE cargas_masivas
  ADD COLUMN importacion_automatica boolean NOT NULL DEFAULT false;
