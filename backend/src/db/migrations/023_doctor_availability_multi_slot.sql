-- 023: allow multiple time slots per day per doctor
-- Previously UNIQUE(doctor_id, branch_id, day_of_week) enforced one slot per day.
-- Doctors now have variable schedules (e.g. morning + afternoon shifts on the same day).

-- Drop the one-per-day unique constraint
ALTER TABLE doctor_availability
  DROP CONSTRAINT IF EXISTS doctor_availability_doctor_id_branch_id_day_of_week_key;

-- Add an optional human-readable label for each slot (e.g. "Morning", "Afternoon")
ALTER TABLE doctor_availability
  ADD COLUMN IF NOT EXISTS label TEXT;

-- Re-index for fast availability lookups
DROP INDEX IF EXISTS idx_doctor_availability_doctor;
DROP INDEX IF EXISTS idx_doctor_availability_branch;

CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor  ON doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_branch  ON doctor_availability(branch_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_day     ON doctor_availability(doctor_id, day_of_week);
