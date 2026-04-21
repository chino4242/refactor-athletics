-- Add variant support to workout_programs
-- variant 'A' is the default, 'B' and 'C' are alternatives
-- The API picks variant based on week number: weekNum % variantCount

ALTER TABLE workout_programs ADD COLUMN IF NOT EXISTS variant TEXT DEFAULT 'A';

-- Update index to include variant
DROP INDEX IF EXISTS idx_workout_programs_default;
CREATE INDEX idx_workout_programs_default ON workout_programs(is_default, training_path, day_of_week, variant) WHERE is_default = TRUE;
