CREATE TABLE recomendaciones_analitica (
  postulante_id text NOT NULL,
  huella text NOT NULL,
  version_reglas integer NOT NULL,
  generada_en timestamptz NOT NULL DEFAULT now(),
  cursos jsonb NOT NULL,
  contenido text NOT NULL,
  origen text NOT NULL CHECK (origen IN ('ia', 'local')),
  PRIMARY KEY (postulante_id, version_reglas, huella)
);
