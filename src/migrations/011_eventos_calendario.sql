-- Migración 011: Tabla de eventos internos del calendario académico
-- Permite al director/secretaria crear eventos personalizados visibles en el calendario

CREATE TABLE IF NOT EXISTS eventos_calendario (
  id_evento       SERIAL PRIMARY KEY,
  id_academia     VARCHAR(100) NOT NULL,
  titulo          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  fecha           DATE NOT NULL,
  tipo            VARCHAR(50) NOT NULL DEFAULT 'evento',  -- evento | feriado | reunion | pago_especial
  creado_por      VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,

  CONSTRAINT fk_eventos_academia FOREIGN KEY (id_academia)
    REFERENCES academias(id_academia) ON DELETE CASCADE,
  CONSTRAINT fk_eventos_creador FOREIGN KEY (creado_por)
    REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_eventos_academia_fecha
  ON eventos_calendario(id_academia, fecha) WHERE activo = TRUE;
