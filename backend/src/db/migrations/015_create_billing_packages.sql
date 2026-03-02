-- 015: billing rules (admin-configured packages & discount policies)

-- Package pricing: pay upfront for N sessions at a discounted rate
CREATE TABLE IF NOT EXISTS billing_packages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type_id  UUID REFERENCES session_types(id) ON DELETE CASCADE,
  name             VARCHAR(120) NOT NULL,
  session_count    SMALLINT NOT NULL CHECK (session_count > 1),
  total_price      NUMERIC(10,2) NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tracks which patients have purchased a package and remaining sessions
CREATE TABLE IF NOT EXISTS patient_packages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  package_id          UUID NOT NULL REFERENCES billing_packages(id) ON DELETE RESTRICT,
  sessions_remaining  SMALLINT NOT NULL,
  purchased_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_patient_packages_patient ON patient_packages(patient_id);

-- Insurance / third-party billing notes per patient/session
CREATE TABLE IF NOT EXISTS insurance_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider     VARCHAR(120) NOT NULL,
  policy_number VARCHAR(80),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
