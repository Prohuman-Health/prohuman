-- Allow drawing-based questions (tablet/stylus sketches)
ALTER TYPE answer_type ADD VALUE IF NOT EXISTS 'drawing_pad';
