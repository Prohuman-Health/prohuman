-- 025: patient custom labels
CREATE TABLE IF NOT EXISTS patient_label_definitions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id  UUID REFERENCES branches(id) ON DELETE CASCADE,
  name       VARCHAR(60) NOT NULL,
  color      VARCHAR(7) NOT NULL DEFAULT '#6366f1',  -- hex
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, name)
);

CREATE TABLE IF NOT EXISTS patient_label_assignments (
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  label_id   UUID NOT NULL REFERENCES patient_label_definitions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (patient_id, label_id)
);

CREATE INDEX idx_pla_patient ON patient_label_assignments(patient_id);
CREATE INDEX idx_pla_label   ON patient_label_assignments(label_id);
