-- Default workout programs: full schema
-- Creates workout_programs table (was never applied) with default program support

-- 1. Workout Programs (templates) — supports both user-created and system defaults
CREATE TABLE IF NOT EXISTS workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for system defaults
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  training_path TEXT, -- 'hybrid', 'strength', 'endurance', 'mobility'
  day_of_week TEXT, -- 'monday', 'tuesday', etc.
  source_program_id UUID REFERENCES workout_programs(id), -- links user copy to original default
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Extend program_blocks with new columns
ALTER TABLE program_blocks ADD COLUMN IF NOT EXISTS alt_exercise_id TEXT;
ALTER TABLE program_blocks ADD COLUMN IF NOT EXISTS alt_equipment TEXT[];
ALTER TABLE program_blocks ADD COLUMN IF NOT EXISTS outdoor_alternative TEXT;
ALTER TABLE program_blocks ADD COLUMN IF NOT EXISTS section TEXT; -- 'warmup', 'main', 'core', 'cooldown'
ALTER TABLE program_blocks ADD COLUMN IF NOT EXISTS target_duration_seconds INTEGER;
ALTER TABLE program_blocks ADD COLUMN IF NOT EXISTS rest_seconds INTEGER DEFAULT 90;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_workout_programs_user ON workout_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_programs_default ON workout_programs(is_default, training_path) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_workout_programs_user_path ON workout_programs(user_id, training_path);

-- 4. RLS
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view programs" ON workout_programs FOR SELECT USING (true);
CREATE POLICY "Users can manage own programs" ON workout_programs FOR ALL 
  USING (user_id IS NULL OR auth.uid() = user_id);

-- 5. Fix program_blocks FK — it references workout_programs which now exists
-- program_blocks already exists but may reference a non-existent table
-- Re-add the FK if needed (safe to skip if already correct)
