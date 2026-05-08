-- 035: add medical_media answer type for X-ray / MRI / movement video uploads
ALTER TYPE answer_type ADD VALUE IF NOT EXISTS 'medical_media';
