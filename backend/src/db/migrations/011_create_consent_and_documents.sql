-- 011: consent forms & documents
CREATE TABLE IF NOT EXISTS consent_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(180) NOT NULL,
  content     TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  template_id      UUID NOT NULL REFERENCES consent_templates(id) ON DELETE RESTRICT,
  signed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_data   TEXT,     -- base64 or file URL
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_patient ON consent_records(patient_id);

CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  session_id   UUID REFERENCES sessions(id) ON DELETE SET NULL,
  file_name    VARCHAR(255) NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    VARCHAR(80) NOT NULL,
  category     VARCHAR(80),   -- e.g. 'xray', 'referral', 'insurance'
  uploaded_by  UUID NOT NULL REFERENCES staff(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_patient ON documents(patient_id);
