-- Workout Programs Schema
-- Allows users to create custom workout programs and assign them to calendar days

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
  block_order INTEGER NOT NULL, -- Order within the program
  block_type TEXT NOT NULL, -- 'exercise' or 'treadmill'
  
  -- For exercises
  exercise_id TEXT, -- References catalog.id (nullable for treadmill blocks)
  target_sets INTEGER,
  target_reps INTEGER,
  target_weight NUMERIC,
  is_superset BOOLEAN DEFAULT FALSE,
  superset_group INTEGER, -- Groups exercises into supersets
  
  -- For treadmill blocks
  duration_seconds INTEGER, -- Duration in seconds
  incline NUMERIC, -- Incline percentage
  intensity TEXT, -- 'zone2', 'base', 'push', 'all_out'
  
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
  
  UNIQUE(user_id, scheduled_date) -- One program per day
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_programs_user ON workout_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_program_blocks_program ON program_blocks(program_id, block_order);
CREATE INDEX IF NOT EXISTS idx_program_schedule_user_date ON program_schedule(user_id, scheduled_date);

-- RLS Policies
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_schedule ENABLE ROW LEVEL SECURITY;

-- workout_programs policies
CREATE POLICY "Users can view all programs" ON workout_programs FOR SELECT USING (true);
CREATE POLICY "Users can manage own programs" ON workout_programs FOR ALL USING (auth.uid() = user_id);

-- program_blocks policies
CREATE POLICY "Users can view all blocks" ON program_blocks FOR SELECT USING (true);
CREATE POLICY "Users can manage blocks of own programs" ON program_blocks FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM workout_programs 
    WHERE workout_programs.id = program_blocks.program_id 
    AND workout_programs.user_id = auth.uid()
  ));

-- program_schedule policies
CREATE POLICY "Users can view all schedules" ON program_schedule FOR SELECT USING (true);
CREATE POLICY "Users can manage own schedule" ON program_schedule FOR ALL USING (auth.uid() = user_id);
