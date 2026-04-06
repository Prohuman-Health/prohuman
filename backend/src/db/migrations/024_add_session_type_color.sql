-- 024: add color to session_types
ALTER TABLE session_types ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT NULL;
-- e.g. '#2493A2'  (hex including #)
