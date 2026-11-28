ALTER TABLE usuarios
  ADD COLUMN password_cambio_obligatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN password_cambio_motivo text;

UPDATE usuarios
SET password_cambio_obligatorio = true,
    password_cambio_motivo = 'CREDENCIAL_PROVISIONAL_EXISTENTE'
WHERE password_provisional_hasta IS NOT NULL;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_password_cambio_motivo_check
  CHECK (password_cambio_motivo IS NULL OR password_cambio_motivo IN (
    'CREDENCIAL_PROVISIONAL_EXISTENTE', 'RESTABLECIMIENTO_ADMINISTRATIVO'
  ));

ALTER TABLE entregas_credenciales_usuarios
  ADD COLUMN tipo_password text NOT NULL DEFAULT 'ALEATORIA',
  ADD CONSTRAINT entregas_credenciales_tipo_password_check
    CHECK (tipo_password IN ('ALEATORIA', 'DNI'));
