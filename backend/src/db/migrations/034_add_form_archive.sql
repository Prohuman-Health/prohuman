-- 034: add is_archived flag to forms
ALTER TABLE forms ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_forms_is_archived ON forms(is_archived);
