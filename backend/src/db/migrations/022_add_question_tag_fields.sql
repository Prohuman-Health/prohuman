-- 022: add structured tag fields to questions
-- category    → primary classification (Intake, Assessment, SOAP Note, etc.)
-- treatment_tags → which treatment type this question belongs to (multi-value)
-- body_regions   → relevant body areas (multi-value)

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS category       TEXT NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS treatment_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS body_regions   TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing section tags into category (take first matching tag if present)
UPDATE questions
SET category = tag_val
FROM (
  SELECT id,
         (SELECT t FROM unnest(tags) AS t
          WHERE t IN (
            'Intake','Present History','Past History','Medical History',
            'Lifestyle Assessment','Posture','Assessment','Diagnosis',
            'Recovery Plan','SOAP Note','Exercises','Parameters',
            'Consultants','Payment','General'
          )
          LIMIT 1) AS tag_val
  FROM questions
) AS derived
WHERE questions.id = derived.id
  AND derived.tag_val IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_category       ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_treatment_tags ON questions USING GIN(treatment_tags);
CREATE INDEX IF NOT EXISTS idx_questions_body_regions   ON questions USING GIN(body_regions);
