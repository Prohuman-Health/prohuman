-- 033: Doctor leave / inactive periods
-- A leave period makes the doctor's staff account inaccessible for login
-- during [from_date, to_date] (inclusive).  The account and all history remain
-- visible to admins in the "archived" view.

CREATE TABLE IF NOT EXISTS doctor_leave_periods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  from_date   DATE NOT NULL,
  to_date     DATE NOT NULL,
  reason      TEXT,
  created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (to_date >= from_date)
);

CREATE INDEX idx_doctor_leave_doctor ON doctor_leave_periods(doctor_id);
CREATE INDEX idx_doctor_leave_dates  ON doctor_leave_periods(from_date, to_date);
