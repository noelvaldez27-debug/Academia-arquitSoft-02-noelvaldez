CREATE TABLE auditoria_credenciales_usuarios (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES usuarios(id),
  actor_id integer NOT NULL REFERENCES usuarios(id),
  evento text NOT NULL CHECK (evento IN (
    'ASIGNACION_INICIAL', 'CAMBIO_VOLUNTARIO', 'CAMBIO_OBLIGATORIO', 'RESTABLECIMIENTO_ADMINISTRATIVO'
  )),
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auditoria_credenciales_usuario_historial
  ON auditoria_credenciales_usuarios (usuario_id, id);
