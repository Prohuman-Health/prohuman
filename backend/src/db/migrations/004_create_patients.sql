-- 004: patients
CREATE TYPE gender_type  AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE referral_src AS ENUM ('self', 'gp', 'specialist', 'hospital', 'internal');

CREATE TABLE IF NOT EXISTS patients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code     VARCHAR(20) UNIQUE NOT NULL,  -- e.g. PH-000042
  full_name        VARCHAR(120) NOT NULL,
  age              SMALLINT NOT NULL CHECK (age > 0 AND age < 130),
  gender           gender_type NOT NULL,
  phone            VARCHAR(30) NOT NULL,
  email            VARCHAR(180),
  complaints       TEXT NOT NULL,
  referral_source  referral_src,
  referral_details TEXT,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_phone     ON patients(phone);
CREATE INDEX idx_patients_full_name ON patients(full_name);
CREATE INDEX idx_patients_branch    ON patients(branch_id);

-- Referral documents / detailed records stored separately
CREATE TABLE IF NOT EXISTS referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  source_type      referral_src NOT NULL,
  referring_name   VARCHAR(120),
  referring_org    VARCHAR(180),
  contact          VARCHAR(100),
  notes            TEXT,
  document_url     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
