-- 009: invoices & billing
CREATE TYPE payment_status AS ENUM ('pending','paid','waived');

CREATE TABLE IF NOT EXISTS invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  amount      NUMERIC(10,2) NOT NULL,
  status      payment_status NOT NULL DEFAULT 'pending',
  paid_at     TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id)  -- one invoice per session
);

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status  ON invoices(status);
