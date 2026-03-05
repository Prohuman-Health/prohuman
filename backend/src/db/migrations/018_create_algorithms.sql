-- 018: algorithm directory (clinical care pathways)

CREATE TABLE IF NOT EXISTS algorithms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(200) NOT NULL,           -- e.g. "Frozen Shoulder Protocol"
  diagnosis        VARCHAR(200),                    -- ICD-code or common name
  description      TEXT,
  -- JSONB arrays for flexible structured content
  evaluation_steps JSONB NOT NULL DEFAULT '[]',     -- [{order, title, description, notes}]
  treatment_steps  JSONB NOT NULL DEFAULT '[]',     -- [{order, phase, title, description}]
  red_flags        JSONB NOT NULL DEFAULT '[]',     -- [{flag, action}]
  outcome_measures TEXT,                            -- e.g. "VAS, DASH score, ROM"
  estimated_sessions SMALLINT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_algorithms_diagnosis ON algorithms(diagnosis);
CREATE INDEX idx_algorithms_active    ON algorithms(is_active);

-- Linking exercises to an algorithm with phase context
CREATE TABLE IF NOT EXISTS algorithm_exercises (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm_id UUID NOT NULL REFERENCES algorithms(id) ON DELETE CASCADE,
  exercise_id  UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  phase        VARCHAR(80),     -- e.g. 'acute', 'subacute', 'chronic', 'maintenance'
  sets         SMALLINT,
  reps         VARCHAR(40),
  frequency    VARCHAR(80),     -- e.g. '2x daily', '3x per week'
  duration     VARCHAR(40),     -- e.g. '30 seconds'
  notes        TEXT,
  order_index  SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (algorithm_id, exercise_id, phase)
);

CREATE INDEX idx_algo_exercises_algorithm ON algorithm_exercises(algorithm_id);

-- Track when an algorithm is applied to a patient (for documentation)
CREATE TABLE IF NOT EXISTS patient_algorithms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  algorithm_id UUID NOT NULL REFERENCES algorithms(id) ON DELETE RESTRICT,
  session_id   UUID REFERENCES sessions(id) ON DELETE SET NULL,
  applied_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  notes        TEXT,
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_algorithms_patient   ON patient_algorithms(patient_id);
CREATE INDEX idx_patient_algorithms_algorithm ON patient_algorithms(algorithm_id);
