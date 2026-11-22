-- Migración 001: Crear tabla de sedes y sembrar sedes iniciales (AC05)
CREATE TABLE IF NOT EXISTS sedes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Sembrar sedes iniciales de la Academia Sofía
INSERT INTO sedes (nombre) VALUES ('Hana'), ('Urin'), ('Central')
ON CONFLICT (nombre) DO NOTHING;
