-- 027: allow file upload answer type and nullable question category

ALTER TYPE answer_type ADD VALUE IF NOT EXISTS 'file_upload';

ALTER TABLE questions
  ALTER COLUMN category DROP NOT NULL,
  ALTER COLUMN category DROP DEFAULT;
