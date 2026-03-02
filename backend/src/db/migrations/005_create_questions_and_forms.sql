-- 005: questions & forms (form builder + question bank)
CREATE TYPE answer_type AS ENUM ('free_text', 'yes_no', 'scale', 'multiple_choice');

CREATE TABLE IF NOT EXISTS questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text         TEXT NOT NULL,
  answer_type  answer_type NOT NULL,
  options      JSONB,            -- array of strings for multiple_choice
  scale_min    SMALLINT,
  scale_max    SMALLINT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(180) NOT NULL,
  description  TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_questions (
  form_id      UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  order_index  SMALLINT NOT NULL DEFAULT 0,
  is_required  BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (form_id, question_id)
);

CREATE INDEX idx_form_questions_form ON form_questions(form_id);
