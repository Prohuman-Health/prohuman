-- 020: access control & audit logging

-- Per-physiotherapist form visibility (admin-managed)
CREATE TABLE IF NOT EXISTS staff_form_access (
  staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  form_id    UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  granted    BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (staff_id, form_id)
);

-- Activity audit log (who accessed/edited what, when, from where)
CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  patient_id  UUID REFERENCES patients(id) ON DELETE SET NULL,
  resource    VARCHAR(80)  NOT NULL,   -- 'patient', 'session', 'form', 'document', 'invoice', etc.
  resource_id UUID,                    -- id of the accessed resource
  action      VARCHAR(40)  NOT NULL,   -- 'view', 'create', 'edit', 'delete', 'submit_form', 'download_attempt'
  detail      TEXT,                    -- additional context
  ip_address  VARCHAR(50),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_staff     ON activity_log(staff_id);
CREATE INDEX idx_activity_log_patient   ON activity_log(patient_id);
CREATE INDEX idx_activity_log_time      ON activity_log(created_at);
CREATE INDEX idx_activity_log_resource  ON activity_log(resource);
