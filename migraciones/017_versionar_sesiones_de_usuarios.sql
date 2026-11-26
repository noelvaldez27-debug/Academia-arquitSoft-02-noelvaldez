ALTER TABLE usuarios
  ADD COLUMN version_sesion integer NOT NULL DEFAULT 0 CHECK (version_sesion >= 0);

CREATE FUNCTION renovar_version_sesion_usuario() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.activo IS DISTINCT FROM NEW.activo OR OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
    NEW.version_sesion := OLD.version_sesion + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER usuarios_version_sesion
  BEFORE UPDATE OF activo, password_hash ON usuarios
  FOR EACH ROW EXECUTE FUNCTION renovar_version_sesion_usuario();
