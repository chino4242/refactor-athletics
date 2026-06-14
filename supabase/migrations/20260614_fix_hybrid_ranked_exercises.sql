-- Fix default hybrid programs: add all 12 ranked exercises
-- Run this AFTER identifying program IDs for each day

-- Step 1: Find your default hybrid program IDs
-- SELECT id, name, day_of_week FROM workout_programs WHERE is_default = true AND training_path = 'hybrid';

-- Step 2: Replace chin_up with pull_up on Tuesday and Friday
UPDATE program_blocks SET exercise_id = 'pull_up' 
WHERE exercise_id = 'chin_up' 
AND workout_id IN (SELECT id FROM workout_programs WHERE is_default = true AND training_path = 'hybrid');

-- Step 3: Add push_ups to Monday (finisher, after last exercise)
INSERT INTO program_blocks (workout_id, exercise_id, block_type, target_sets, target_reps, section, block_order, notes)
SELECT wp.id, 'push_ups', 'exercise', 3, NULL, 'main', 
  (SELECT COALESCE(MAX(block_order), 0) + 1 FROM program_blocks WHERE workout_id = wp.id),
  'AMRAP — set 1 is your ranked attempt'
FROM workout_programs wp 
WHERE wp.is_default = true AND wp.training_path = 'hybrid' AND wp.day_of_week ILIKE 'monday'
AND NOT EXISTS (SELECT 1 FROM program_blocks pb WHERE pb.workout_id = wp.id AND pb.exercise_id = 'push_ups');

-- Step 4: Add push_ups to Thursday (finisher)
INSERT INTO program_blocks (workout_id, exercise_id, block_type, target_sets, target_reps, section, block_order, notes)
SELECT wp.id, 'push_ups', 'exercise', 2, NULL, 'main',
  (SELECT COALESCE(MAX(block_order), 0) + 1 FROM program_blocks WHERE workout_id = wp.id),
  'AMRAP — max reps per set'
FROM workout_programs wp 
WHERE wp.is_default = true AND wp.training_path = 'hybrid' AND wp.day_of_week ILIKE 'thursday'
AND NOT EXISTS (SELECT 1 FROM program_blocks pb WHERE pb.workout_id = wp.id AND pb.exercise_id = 'push_ups');

-- Step 5: Add dead_hang to Tuesday (cooldown)
INSERT INTO program_blocks (workout_id, exercise_id, block_type, target_sets, target_duration_seconds, section, block_order, notes)
SELECT wp.id, 'dead_hang', 'exercise', 3, 60, 'cooldown',
  (SELECT COALESCE(MAX(block_order), 0) + 1 FROM program_blocks WHERE workout_id = wp.id),
  'Max hold — set 1 is ranked attempt. Rest 90s between sets.'
FROM workout_programs wp 
WHERE wp.is_default = true AND wp.training_path = 'hybrid' AND wp.day_of_week ILIKE 'tuesday'
AND NOT EXISTS (SELECT 1 FROM program_blocks pb WHERE pb.workout_id = wp.id AND pb.exercise_id = 'dead_hang');

-- Step 6: Add dead_hang to Thursday (cooldown)
INSERT INTO program_blocks (workout_id, exercise_id, block_type, target_sets, target_duration_seconds, section, block_order, notes)
SELECT wp.id, 'dead_hang', 'exercise', 2, 60, 'cooldown',
  (SELECT COALESCE(MAX(block_order), 0) + 1 FROM program_blocks WHERE workout_id = wp.id),
  'Max hold for grip endurance and spinal decompression.'
FROM workout_programs wp 
WHERE wp.is_default = true AND wp.training_path = 'hybrid' AND wp.day_of_week ILIKE 'thursday'
AND NOT EXISTS (SELECT 1 FROM program_blocks pb WHERE pb.workout_id = wp.id AND pb.exercise_id = 'dead_hang');

-- Step 7: Add run_400m to Friday (replace or supplement treadmill)
-- Note: This adds a structured sprint block. The existing treadmill block can stay for warmup/cooldown.
INSERT INTO program_blocks (workout_id, exercise_id, block_type, target_sets, target_duration_seconds, section, block_order, notes)
SELECT wp.id, 'run_400m', 'exercise', 3, NULL, 'main',
  (SELECT COALESCE(MAX(block_order), 0) + 1 FROM program_blocks WHERE workout_id = wp.id),
  '400m sprint — all out. Rest 3-4 min between. Set 1 = ranked attempt.'
FROM workout_programs wp 
WHERE wp.is_default = true AND wp.training_path = 'hybrid' AND wp.day_of_week ILIKE 'friday'
AND NOT EXISTS (SELECT 1 FROM program_blocks pb WHERE pb.workout_id = wp.id AND pb.exercise_id = 'run_400m');

-- Step 8: Add run_1_mile to Saturday (first main exercise)
INSERT INTO program_blocks (workout_id, exercise_id, block_type, target_sets, target_duration_seconds, section, block_order, notes)
SELECT wp.id, 'run_1_mile', 'exercise', 1, NULL, 'main', 0,
  'Timed mile — all out after 5 min warmup jog. Log time for ranking.'
FROM workout_programs wp 
WHERE wp.is_default = true AND wp.training_path = 'hybrid' AND wp.day_of_week ILIKE 'saturday'
AND NOT EXISTS (SELECT 1 FROM program_blocks pb WHERE pb.workout_id = wp.id AND pb.exercise_id = 'run_1_mile');

-- Note: run_5k can be added as a variant B for Saturday (alternate weeks)
-- For now, the mile covers the cardio ranking. 5K can be Quick Log'd or added to variant rotation later.
