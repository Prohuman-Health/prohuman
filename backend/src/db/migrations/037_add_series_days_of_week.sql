-- 037: Add days_of_week to session_series for specific-day recurring patterns
ALTER TABLE session_series
  ADD COLUMN IF NOT EXISTS days_of_week SMALLINT[] DEFAULT NULL;
