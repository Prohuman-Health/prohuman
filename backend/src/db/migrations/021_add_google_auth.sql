-- 021: add google_id to staff for OAuth login
-- staff.password_hash needs to be nullable for OAuth-only accounts

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS google_id    VARCHAR(200) UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT,
  -- Make password_hash nullable so Google-only staff don't need a password
  ALTER COLUMN password_hash DROP NOT NULL;

-- Also update the staff_role enum to include new roles from requirements
-- (using a safe rename + re-create pattern)
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'physiotherapist';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'massager';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'fitness_trainer';

CREATE INDEX IF NOT EXISTS idx_staff_google_id ON staff(google_id);
