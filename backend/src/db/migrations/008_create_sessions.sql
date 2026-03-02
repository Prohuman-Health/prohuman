-- 008: sessions
CREATE TYPE session_status     AS ENUM ('pending','confirmed','completed','cancelled','no-show','late-cancellation','rescheduled');
CREATE TYPE attendance_status  AS ENUM ('attended','no-show','late-cancellation','rescheduled');
CREATE TYPE recurrence_pattern AS ENUM ('daily','weekly','biweekly','custom');

-- Recurring series header
CREATE TABLE IF NOT EXISTS session_series (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence      recurrence_pattern NOT NULL,
  interval_days   SMALLINT,        -- for custom recurrence
  total_sessions  SMALLINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id         UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  session_type_id   UUID NOT NULL REFERENCES session_types(id) ON DELETE RESTRICT,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  SMALLINT NOT NULL,
  status            session_status NOT NULL DEFAULT 'pending',
  attendance        attendance_status,
  pre_session_notes TEXT,
  series_id         UUID REFERENCES session_series(id) ON DELETE SET NULL,
  treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL,
  created_by        UUID NOT NULL REFERENCES staff(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_patient     ON sessions(patient_id);
CREATE INDEX idx_sessions_doctor      ON sessions(doctor_id);
CREATE INDEX idx_sessions_branch      ON sessions(branch_id);
CREATE INDEX idx_sessions_scheduled   ON sessions(scheduled_at);
CREATE INDEX idx_sessions_series      ON sessions(series_id);
CREATE INDEX idx_sessions_plan        ON sessions(treatment_plan_id);

-- Form answers per session
CREATE TABLE IF NOT EXISTS session_form_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  form_id         UUID NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  answer_text     TEXT,
  answer_value    NUMERIC,
  answer_options  JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sfr_session ON session_form_responses(session_id);

-- Cancellation / reschedule log
CREATE TABLE IF NOT EXISTS session_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  changed_by       UUID NOT NULL REFERENCES staff(id),
  old_status       session_status,
  new_status       session_status NOT NULL,
  reason           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
