ALTER TABLE usuarios ADD COLUMN condicion text
  CHECK (condicion IS NULL OR (rol = 'POSTULANTE' AND condicion IN ('MATRICULADO', 'LIBRE')));

ALTER TABLE filas_carga_masiva ADD COLUMN condicion text
  CHECK (condicion IN ('MATRICULADO', 'LIBRE'));
