-- 002: staff (admins, receptionists, doctors)
CREATE TYPE staff_role AS ENUM ('admin', 'receptionist', 'doctor');

CREATE TABLE IF NOT EXISTS staff (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  role          staff_role NOT NULL,
  phone         VARCHAR(30),
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_email     ON staff(email);
CREATE INDEX idx_staff_branch_id ON staff(branch_id);
