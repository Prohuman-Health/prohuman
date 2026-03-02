-- 013: custom patient intake fields (admin-defined dynamic fields)

CREATE TYPE field_input_type AS ENUM (
  'text', 'number', 'boolean', 'date', 'select', 'multiselect'
);

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity        VARCHAR(40) NOT NULL DEFAULT 'patient',  -- 'patient' | 'session' (extendable)
  label         VARCHAR(120) NOT NULL,
  field_key     VARCHAR(80)  NOT NULL,                   -- snake_case identifier
  input_type    field_input_type NOT NULL DEFAULT 'text',
  options       JSONB,         -- array of strings for select/multiselect
  is_required   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  order_index   SMALLINT NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity, field_key)
);

-- Stores the actual values for each patient's custom fields
CREATE TABLE IF NOT EXISTS custom_field_values (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_def_id      UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  patient_id        UUID REFERENCES patients(id) ON DELETE CASCADE,
  session_id        UUID REFERENCES sessions(id) ON DELETE CASCADE,
  value             JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (patient_id IS NOT NULL AND session_id IS NULL) OR
    (patient_id IS NULL AND session_id IS NOT NULL)
  ),
  UNIQUE (field_def_id, patient_id),
  UNIQUE (field_def_id, session_id)
);

CREATE INDEX idx_cfv_patient ON custom_field_values(patient_id);
CREATE INDEX idx_cfv_session ON custom_field_values(session_id);
