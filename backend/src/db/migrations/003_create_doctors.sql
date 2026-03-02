-- 003: doctors (extension of staff)
CREATE TABLE IF NOT EXISTS doctors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  specialty  VARCHAR(120),
  bio        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id)
);

-- Doctor availability per branch, per day
CREATE TABLE IF NOT EXISTS doctor_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  branch_id    UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (end_time > start_time),
  UNIQUE (doctor_id, branch_id, day_of_week)
);

CREATE INDEX idx_doctor_availability_doctor ON doctor_availability(doctor_id);
CREATE INDEX idx_doctor_availability_branch ON doctor_availability(branch_id);
