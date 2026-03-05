-- 012: clinic settings (admin-controlled key-value store)
-- Supports both global settings and per-branch overrides.

CREATE TABLE IF NOT EXISTS settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id   UUID REFERENCES branches(id) ON DELETE CASCADE,  -- NULL = global
  key         VARCHAR(120) NOT NULL,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (branch_id, key)
);

-- Partial index enforces that global keys (branch_id IS NULL) are also unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_global_key
  ON settings(key) WHERE branch_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_settings_branch ON settings(branch_id);


-- -------------------------------------------------------
-- Default global settings (inserted once, admin can update)
-- -------------------------------------------------------
INSERT INTO settings (branch_id, key, value, description)
VALUES
  (NULL, 'patient_id_prefix',        '"PH"',   'Prefix for auto-generated patient codes'),
  (NULL, 'patient_id_digits',        '6',       'Number of digits in patient code (e.g. 6 → PH-000042)'),
  (NULL, 'default_cancellation_window_hours', '24', 'Hours before session considered a late cancellation'),
  (NULL, 'no_show_fee_enabled',      'false',   'Charge a fee for no-shows'),
  (NULL, 'no_show_fee_amount',       '0',       'Fixed no-show fee amount'),
  (NULL, 'late_cancel_fee_enabled',  'false',   'Charge a fee for late cancellations'),
  (NULL, 'late_cancel_fee_amount',   '0',       'Fixed late cancellation fee amount'),
  (NULL, 'waitlist_notify_window_hours', '2',   'Hours waitlisted patient has to confirm a freed slot'),
  (NULL, 'supported_file_types',     '["pdf","jpeg","jpg","png","dicom"]', 'Allowed document upload types'),
  (NULL, 'max_file_size_mb',         '20',      'Maximum upload file size in MB'),
  (NULL, 'clinic_name',              '"ProHuman Health"', 'Clinic display name'),
  (NULL, 'clinic_timezone',          '"Asia/Kolkata"',    'Timezone used for all scheduling')
ON CONFLICT DO NOTHING;
