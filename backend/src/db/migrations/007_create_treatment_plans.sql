-- 007: treatment plans
CREATE TYPE plan_status AS ENUM ('active', 'completed', 'closed');

CREATE TABLE IF NOT EXISTS treatment_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id         UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  goal              TEXT NOT NULL,
  planned_sessions  SMALLINT NOT NULL DEFAULT 1 CHECK (planned_sessions > 0),
  completed_sessions SMALLINT NOT NULL DEFAULT 0,
  start_date        DATE NOT NULL,
  target_end_date   DATE,
  status            plan_status NOT NULL DEFAULT 'active',
  discharge_summary TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tp_patient ON treatment_plans(patient_id);
CREATE INDEX idx_tp_doctor  ON treatment_plans(doctor_id);
