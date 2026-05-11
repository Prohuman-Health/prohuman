-- 039: patient label audit trail
-- Track who assigned/removed each label and when

-- Add assigned_by to existing assignments
ALTER TABLE patient_label_assignments
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES staff(id) ON DELETE SET NULL;

-- Full audit log (persists even after label is removed)
CREATE TABLE IF NOT EXISTS patient_label_audit (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  label_id    UUID        NOT NULL REFERENCES patient_label_definitions(id) ON DELETE CASCADE,
  action      VARCHAR(10) NOT NULL CHECK (action IN ('assigned', 'removed')),
  actor_id    UUID        REFERENCES staff(id) ON DELETE SET NULL,
  actor_name  VARCHAR(120),          -- denormalised snapshot
  label_name  VARCHAR(60),           -- denormalised snapshot
  label_color VARCHAR(7),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pla_audit_patient ON patient_label_audit(patient_id, created_at DESC);
CREATE INDEX idx_pla_audit_actor   ON patient_label_audit(actor_id);
