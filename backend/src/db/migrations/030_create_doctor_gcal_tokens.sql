-- Google Calendar token storage for doctors
-- Allows the doctor portal to overlay their personal calendar's busy events

CREATE TABLE IF NOT EXISTS doctor_gcal_tokens (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     UUID        NOT NULL UNIQUE REFERENCES doctors(id) ON DELETE CASCADE,
  access_token  TEXT        NOT NULL,
  refresh_token TEXT        NOT NULL,
  token_expiry  TIMESTAMPTZ NOT NULL,
  calendar_id   TEXT        NOT NULL DEFAULT 'primary',
  connected_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_gcal_tokens_doctor_id ON doctor_gcal_tokens(doctor_id);
