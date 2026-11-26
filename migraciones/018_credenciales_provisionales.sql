ALTER TABLE usuarios ADD COLUMN password_provisional_hasta timestamptz;

CREATE TABLE entregas_credenciales_usuarios (
  usuario_id integer PRIMARY KEY REFERENCES usuarios(id),
  administrador_id integer NOT NULL REFERENCES usuarios(id),
  carga_id varchar(36) REFERENCES cargas_masivas(id),
  referencia uuid NOT NULL UNIQUE,
  version_sesion integer NOT NULL,
  vence timestamptz NOT NULL
);
CREATE INDEX entregas_credenciales_por_carga ON entregas_credenciales_usuarios (carga_id, administrador_id);
