-- Apply only the workout programs tables (standalone)
-- Run this in Supabase SQL Editor

-- 1. Workout Programs (templates)
CREATE TABLE IF NOT EXISTS workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Program Blocks (exercises or treadmill intervals within a program)
CREATE TABLE IF NOT EXISTS program_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  block_order INTEGER NOT NULL,
  block_type TEXT NOT NULL,
  
  -- For exercises
  exercise_id TEXT,
  target_sets INTEGER,
  target_reps INTEGER,
  target_weight NUMERIC,
  is_superset BOOLEAN DEFAULT FALSE,
  superset_group INTEGER,
  
  -- For treadmill blocks
  duration_seconds INTEGER,
  incline NUMERIC,
  intensity TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Program Schedule (assigns programs to specific dates)
CREATE TABLE IF NOT EXISTS program_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, scheduled_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_programs_user ON workout_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_program_blocks_program ON program_blocks(program_id, block_order);
CREATE INDEX IF NOT EXISTS idx_program_schedule_user_date ON program_schedule(user_id, scheduled_date);

-- RLS
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_schedule ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view all programs" ON workout_programs;
CREATE POLICY "Users can view all programs" ON workout_programs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own programs" ON workout_programs;
CREATE POLICY "Users can manage own programs" ON workout_programs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all blocks" ON program_blocks;
CREATE POLICY "Users can view all blocks" ON program_blocks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage blocks of own programs" ON program_blocks;
CREATE POLICY "Users can manage blocks of own programs" ON program_blocks FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM workout_programs 
    WHERE workout_programs.id = program_blocks.program_id 
    AND workout_programs.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view all schedules" ON program_schedule;
CREATE POLICY "Users can view all schedules" ON program_schedule FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own schedule" ON program_schedule;
CREATE POLICY "Users can manage own schedule" ON program_schedule FOR ALL USING (auth.uid() = user_id);
