ALTER TABLE auditoria_postulantes DROP CONSTRAINT auditoria_postulantes_operacion_check;
ALTER TABLE auditoria_postulantes
  ADD CONSTRAINT auditoria_postulantes_operacion_check
  CHECK (operacion IN ('ARCHIVADO', 'RECUPERADO', 'VINCULADO'));
