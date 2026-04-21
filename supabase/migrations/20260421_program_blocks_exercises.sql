-- Add exercises JSONB column for superset/giant set blocks
ALTER TABLE program_blocks ADD COLUMN IF NOT EXISTS exercises JSONB;
-- e.g. [{"name": "Bench Press", "reps": "10,8,6,4"}, {"name": "High Pull", "reps": "10"}]
