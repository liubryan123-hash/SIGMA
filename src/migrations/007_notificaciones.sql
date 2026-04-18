-- Migración 007: Notificaciones in-app
-- Ejecutar: psql -h 127.0.0.1 -U edusaas_admin -d edusaas_db -f 007_notificaciones.sql

CREATE TABLE IF NOT EXISTS notificaciones (
  id_notif    SERIAL PRIMARY KEY,
  id_usuario  VARCHAR(100) NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_academia VARCHAR(50)  NOT NULL REFERENCES academias(id_academia) ON DELETE CASCADE,
  tipo        VARCHAR(50)  NOT NULL DEFAULT 'sistema',
  titulo      VARCHAR(200) NOT NULL,
  mensaje     TEXT,
  leida       BOOLEAN NOT NULL DEFAULT false,
  accion_tab  VARCHAR(50),
  creada_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificaciones(id_usuario, leida, creada_en DESC);
