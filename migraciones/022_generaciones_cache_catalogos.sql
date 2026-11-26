CREATE TABLE generaciones_cache_catalogo (
  catalogo text PRIMARY KEY,
  generacion bigint NOT NULL DEFAULT 0
);

INSERT INTO generaciones_cache_catalogo (catalogo) VALUES ('temas'), ('cursos'), ('sedes');

CREATE FUNCTION avanzar_generacion_cache_catalogo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE generaciones_cache_catalogo SET generacion = generacion + 1 WHERE catalogo = TG_ARGV[0];
  RETURN NULL;
END;
$$;

CREATE TRIGGER temas_generacion_cache
AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON temas_banco
FOR EACH STATEMENT EXECUTE FUNCTION avanzar_generacion_cache_catalogo('temas');

CREATE TRIGGER cursos_generacion_cache
AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON cursos_banco
FOR EACH STATEMENT EXECUTE FUNCTION avanzar_generacion_cache_catalogo('cursos');

CREATE TRIGGER sedes_generacion_cache
AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON sedes
FOR EACH STATEMENT EXECUTE FUNCTION avanzar_generacion_cache_catalogo('sedes');
