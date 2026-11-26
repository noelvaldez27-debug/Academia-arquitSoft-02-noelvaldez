CREATE TABLE auditoria_postulantes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  postulante_id integer NOT NULL REFERENCES usuarios(id),
  administrador_id integer NOT NULL REFERENCES usuarios(id),
  operacion text NOT NULL CHECK (operacion IN ('ARCHIVADO', 'RECUPERADO')),
  creada_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auditoria_postulantes_historial ON auditoria_postulantes (postulante_id, id);
