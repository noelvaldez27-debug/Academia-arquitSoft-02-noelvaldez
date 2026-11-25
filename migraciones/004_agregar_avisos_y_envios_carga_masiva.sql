ALTER TABLE cargas_masivas ADD COLUMN avisos JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE envios_carga_masiva (
  carga_id VARCHAR(36) NOT NULL REFERENCES cargas_masivas(id) ON DELETE CASCADE,
  numero_lote INTEGER NOT NULL,
  publicado BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (carga_id, numero_lote)
);
