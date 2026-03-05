-- 019: patient points & rewards system

CREATE TYPE points_event AS ENUM (
  'session_payment',   -- earned when session invoice is paid
  'referral_bonus',    -- earned when referred patient completes first session
  'redeemed',          -- negative: used towards a free session
  'adjustment'         -- manual admin adjustment
);

CREATE TABLE IF NOT EXISTS patient_points (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  event_type   points_event NOT NULL,
  points       INT NOT NULL,             -- positive = earned, negative = redeemed
  session_id   UUID REFERENCES sessions(id) ON DELETE SET NULL,
  referral_id  UUID REFERENCES referrals(id) ON DELETE SET NULL,
  note         TEXT,
  created_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_points_patient    ON patient_points(patient_id);
CREATE INDEX idx_patient_points_session    ON patient_points(session_id);
CREATE INDEX idx_patient_points_event_type ON patient_points(event_type);

-- Convenience view for current balance per patient
CREATE VIEW patient_points_balance AS
  SELECT
    patient_id,
    SUM(points) AS balance,
    SUM(CASE WHEN points > 0 THEN points ELSE 0 END) AS total_earned,
    SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) AS total_redeemed
  FROM patient_points
  GROUP BY patient_id;

-- Store the points-per-rupee conversion rate in settings
-- e.g. key='points_per_rupee', value='0.1' means ₹1 → 0.1 pt (₹2000 → 200 pts)
-- e.g. key='points_redemption_threshold', value='2000' means need 2000 pts for free session
-- These go into the existing settings table (no new table needed)
