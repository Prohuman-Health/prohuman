-- 016: exercise directory

CREATE TABLE IF NOT EXISTS exercises (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL,
  category     VARCHAR(80),                 -- e.g. 'strengthening', 'stretching', 'cardio'
  description  TEXT,
  instructions TEXT,                        -- step-by-step
  video_url    TEXT,
  image_url    TEXT,
  tags         TEXT[],                      -- quick search tags
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_active   ON exercises(is_active);
