-- 006: session types
CREATE TABLE IF NOT EXISTS session_types (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     VARCHAR(120) NOT NULL,
  description              TEXT,
  default_duration_minutes SMALLINT NOT NULL DEFAULT 60 CHECK (default_duration_minutes > 0),
  fee                      NUMERIC(10,2) NOT NULL DEFAULT 0,
  form_id                  UUID REFERENCES forms(id) ON DELETE SET NULL,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
