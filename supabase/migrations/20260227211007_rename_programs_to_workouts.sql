-- Rename the core tables
ALTER TABLE workout_programs RENAME TO workouts;
ALTER TABLE program_blocks RENAME TO workout_blocks;
ALTER TABLE program_schedule RENAME TO workout_schedules;

-- Rename foreign key columns
ALTER TABLE workout_blocks RENAME COLUMN program_id TO workout_id;
ALTER TABLE workout_schedules RENAME COLUMN program_id TO workout_id;

-- Ensure indexes are renamed (mostly for cleanliness)
ALTER INDEX IF EXISTS idx_workout_programs_user RENAME TO idx_workouts_user;
ALTER INDEX IF EXISTS idx_program_blocks_program RENAME TO idx_workout_blocks_workout;
ALTER INDEX IF EXISTS idx_program_schedule_user_date RENAME TO idx_workout_schedules_user_date;

-- Re-create / Rename RLS Policies for workouts
DROP POLICY IF EXISTS "Users can view all programs" ON workouts;
CREATE POLICY "Users can view all workouts" ON workouts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own programs" ON workouts;
CREATE POLICY "Users can manage own workouts" ON workouts FOR ALL USING (auth.uid() = user_id);

-- Re-create / Rename RLS Policies for workout_blocks
DROP POLICY IF EXISTS "Users can view all blocks" ON workout_blocks;
CREATE POLICY "Users can view all blocks" ON workout_blocks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage blocks of own programs" ON workout_blocks;
CREATE POLICY "Users can manage blocks of own workouts" ON workout_blocks FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM workouts 
    WHERE workouts.id = workout_blocks.workout_id 
    AND workouts.user_id = auth.uid()
  ));

-- Re-create / Rename RLS Policies for workout_schedules
DROP POLICY IF EXISTS "Users can view all schedules" ON workout_schedules;
CREATE POLICY "Users can view all schedules" ON workout_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own schedule" ON workout_schedules;
CREATE POLICY "Users can manage own schedules" ON workout_schedules FOR ALL USING (auth.uid() = user_id);
