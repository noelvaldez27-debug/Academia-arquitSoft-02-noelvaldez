CREATE TABLE temas_banco (
  id text PRIMARY KEY,
  curso_id text NOT NULL REFERENCES cursos_banco(id),
  nombre text NOT NULL CHECK (btrim(nombre) <> ''),
  activo boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX temas_banco_nombre_por_curso ON temas_banco (curso_id, lower(nombre));

CREATE FUNCTION validar_tema_banco() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  tema text := NEW.contenido->>'temaId';
  curso text;
BEGIN
  IF tema IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF tema = (OLD.contenido->>'temaId') THEN RETURN NEW; END IF;
  ELSIF TG_TABLE_NAME = 'preguntas_banco' THEN
    IF EXISTS (SELECT 1 FROM preguntas_banco WHERE id = NEW.id AND contenido->>'temaId' = tema) THEN
      RETURN NEW;
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'preguntas_banco' THEN
    curso := NEW.curso_id;
  ELSE
    SELECT curso_id INTO curso FROM separatas WHERE id = NEW.separata_id;
  END IF;
  PERFORM 1 FROM temas_banco WHERE id = tema AND curso_id = curso AND activo FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tema no disponible para el curso' USING ERRCODE = '23514', CONSTRAINT = 'tema_banco_disponible';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER preguntas_banco_validar_tema BEFORE INSERT OR UPDATE OF contenido ON preguntas_banco
  FOR EACH ROW EXECUTE FUNCTION validar_tema_banco();
CREATE TRIGGER propuestas_banco_validar_tema BEFORE INSERT OR UPDATE OF contenido ON propuestas_banco
  FOR EACH ROW EXECUTE FUNCTION validar_tema_banco();
