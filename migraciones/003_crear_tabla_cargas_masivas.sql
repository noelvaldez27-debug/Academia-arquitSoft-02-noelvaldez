-- Migración 003: Crear tabla de cargas masivas y filas a procesar (ADR-016, CA-U13)
CREATE TABLE IF NOT EXISTS cargas_masivas (
  id VARCHAR(36) PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sede_id INTEGER REFERENCES sedes(id) ON DELETE RESTRICT,
  estado VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
  total_filas INTEGER NOT NULL DEFAULT 0,
  creadas INTEGER NOT NULL DEFAULT 0,
  ya_existian INTEGER NOT NULL DEFAULT 0,
  rechazadas INTEGER NOT NULL DEFAULT 0,
  errores JSONB NOT NULL DEFAULT '[]'::jsonb,
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS filas_carga_masiva (
  id SERIAL PRIMARY KEY,
  carga_id VARCHAR(36) NOT NULL REFERENCES cargas_masivas(id) ON DELETE CASCADE,
  numero_lote INTEGER NOT NULL DEFAULT 1,
  numero_fila INTEGER NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  dni VARCHAR(8) NOT NULL,
  sede_id INTEGER NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT,
  carrera VARCHAR(100) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cargas_masivas_sede ON cargas_masivas (sede_id);
CREATE INDEX IF NOT EXISTS idx_cargas_masivas_usuario ON cargas_masivas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_filas_carga_masiva_lote ON filas_carga_masiva (carga_id, numero_lote);
CREATE INDEX IF NOT EXISTS idx_filas_carga_masiva_estado ON filas_carga_masiva (carga_id, estado);
