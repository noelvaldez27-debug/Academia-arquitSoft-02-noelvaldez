-- Migración 002: Crear tabla de usuarios y restricciones de integridad (RC07, RC15, AC04)
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  dni VARCHAR(8),
  correo VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  sede_id INTEGER REFERENCES sedes(id) ON DELETE RESTRICT,
  carrera VARCHAR(100),
  alcance_administrador VARCHAR(50),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Restricciones de integridad de dominio
  CONSTRAINT chk_postulante_datos CHECK (
    rol != 'POSTULANTE' OR (dni IS NOT NULL AND sede_id IS NOT NULL AND carrera IS NOT NULL)
  ),
  CONSTRAINT chk_docente_datos CHECK (
    rol != 'DOCENTE' OR (dni IS NOT NULL AND sede_id IS NULL AND carrera IS NULL)
  ),
  CONSTRAINT chk_admin_sede_datos CHECK (
    rol != 'ADMINISTRADOR' OR alcance_administrador != 'SEDE' OR (sede_id IS NOT NULL)
  ),
  CONSTRAINT chk_admin_general_datos CHECK (
    rol != 'ADMINISTRADOR' OR alcance_administrador != 'GENERAL' OR (sede_id IS NULL)
  )
);

-- DNI único para postulantes y docentes cuando está presente
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_dni_unico ON usuarios (dni) WHERE dni IS NOT NULL;

-- Índice único parcial que garantiza la existencia de un solo Administrador General (CA-U04)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_administrador_general ON usuarios (rol) 
WHERE rol = 'ADMINISTRADOR' AND alcance_administrador = 'GENERAL';
