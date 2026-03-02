-- 010: waitlist
CREATE TYPE waitlist_status AS ENUM ('waiting','notified','booked','expired');

CREATE TABLE IF NOT EXISTS waitlist (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id        UUID REFERENCES doctors(id) ON DELETE SET NULL,
  branch_id        UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  session_type_id  UUID REFERENCES session_types(id) ON DELETE SET NULL,
  preferred_dates  JSONB,   -- array of date strings
  status           waitlist_status NOT NULL DEFAULT 'waiting',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waitlist_patient ON waitlist(patient_id);
CREATE INDEX idx_waitlist_branch  ON waitlist(branch_id);
CREATE INDEX idx_waitlist_status  ON waitlist(status);
